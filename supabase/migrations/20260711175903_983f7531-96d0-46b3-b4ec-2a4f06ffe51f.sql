-- Server-side, transactional duplicate-contact merging.
--
-- The browser only creates a job and invokes the runner. All contact, insight,
-- interaction, referral, and relationship changes happen inside one database
-- subtransaction. A failed merge is rolled back while the job records the error.
-- Queued jobs can later be consumed by a background worker without changing the
-- client API.

CREATE SCHEMA IF NOT EXISTS contact_ops;
REVOKE ALL ON SCHEMA contact_ops FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION contact_ops.normalized_contact_member_id(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(
    lower(
      regexp_replace(
        btrim(
          translate(
            value,
            '０１２３４５６７８９－—–﹣　',
            '0123456789---- '
          )
        ),
        '[[:space:]]+',
        '',
        'g'
      )
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION contact_ops.contact_member_key(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, contact_ops
AS $$
  SELECT CASE
    WHEN contact_ops.normalized_contact_member_id(value) ~ '^[0-9]+-[0-9]+$'
      THEN regexp_replace(contact_ops.normalized_contact_member_id(value), '-[0-9]+$', '')
    ELSE contact_ops.normalized_contact_member_id(value)
  END;
$$;

CREATE OR REPLACE FUNCTION contact_ops.contact_name_key(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(
    lower(
      regexp_replace(
        btrim(translate(value, '　', ' ')),
        '[[:space:]]+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION contact_ops.contact_duplicate_key(member_id text, contact_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, contact_ops
AS $$
  SELECT CASE
    WHEN contact_ops.contact_member_key(member_id) IS NOT NULL
      THEN 'member:' || contact_ops.contact_member_key(member_id)
    WHEN contact_ops.contact_name_key(contact_name) IS NOT NULL
      THEN 'name:' || contact_ops.contact_name_key(contact_name)
    ELSE NULL
  END;
$$;

CREATE TABLE IF NOT EXISTS public.contact_merge_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'canceled')),
  total_contacts integer NOT NULL DEFAULT 0 CHECK (total_contacts >= 0),
  duplicate_groups integer NOT NULL DEFAULT 0 CHECK (duplicate_groups >= 0),
  duplicate_contacts integer NOT NULL DEFAULT 0 CHECK (duplicate_contacts >= 0),
  merged_contacts integer NOT NULL DEFAULT 0 CHECK (merged_contacts >= 0),
  progress_processed integer NOT NULL DEFAULT 0 CHECK (progress_processed >= 0),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  heartbeat_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_merge_jobs_user_requested
  ON public.contact_merge_jobs (user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_merge_jobs_queue
  ON public.contact_merge_jobs (status, requested_at)
  WHERE status IN ('queued', 'failed');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_contact_merge_jobs_active_user
  ON public.contact_merge_jobs (user_id)
  WHERE status IN ('queued', 'running');

DROP TRIGGER IF EXISTS trg_contact_merge_jobs_touch_updated_at ON public.contact_merge_jobs;
CREATE TRIGGER trg_contact_merge_jobs_touch_updated_at
BEFORE UPDATE ON public.contact_merge_jobs
FOR EACH ROW EXECUTE FUNCTION public.touch_contacts_updated_at();

ALTER TABLE public.contact_merge_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own merge jobs" ON public.contact_merge_jobs;
CREATE POLICY "Users can view own merge jobs"
  ON public.contact_merge_jobs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.contact_merge_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.contact_merge_jobs TO authenticated;
GRANT ALL ON public.contact_merge_jobs TO service_role;

REVOKE ALL ON FUNCTION contact_ops.normalized_contact_member_id(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION contact_ops.contact_member_key(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION contact_ops.contact_name_key(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION contact_ops.contact_duplicate_key(text, text) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA contact_ops TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION contact_ops.normalized_contact_member_id(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION contact_ops.contact_member_key(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION contact_ops.contact_name_key(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION contact_ops.contact_duplicate_key(text, text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_contacts_user_member_merge_key
  ON public.contacts (user_id, contact_ops.contact_member_key(member_id))
  WHERE deleted_at IS NULL AND member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_user_name_merge_key
  ON public.contacts (user_id, contact_ops.contact_name_key(name))
  WHERE deleted_at IS NULL AND member_id IS NULL;

CREATE OR REPLACE FUNCTION public.create_contact_merge_job()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp, contact_ops, public
SET statement_timeout = '30s'
AS $$
DECLARE
  requester_id uuid := auth.uid();
  existing_job public.contact_merge_jobs%ROWTYPE;
  new_job public.contact_merge_jobs%ROWTYPE;
  contact_total integer := 0;
  group_total integer := 0;
  duplicate_total integer := 0;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(requester_id::text));

  SELECT *
  INTO existing_job
  FROM public.contact_merge_jobs
  WHERE user_id = requester_id
    AND status IN ('queued', 'running')
  ORDER BY requested_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'job_id', existing_job.id,
      'status', existing_job.status,
      'total_contacts', existing_job.total_contacts,
      'duplicate_groups', existing_job.duplicate_groups,
      'duplicate_contacts', existing_job.duplicate_contacts,
      'reused', true
    );
  END IF;

  WITH grouped AS (
    SELECT
      contact_ops.contact_duplicate_key(c.member_id, c.name) AS duplicate_key,
      count(*)::integer AS row_count
    FROM public.contacts c
    WHERE c.user_id = requester_id
      AND c.deleted_at IS NULL
    GROUP BY contact_ops.contact_duplicate_key(c.member_id, c.name)
  )
  SELECT
    (SELECT count(*)::integer
     FROM public.contacts c
     WHERE c.user_id = requester_id AND c.deleted_at IS NULL),
    count(*) FILTER (WHERE duplicate_key IS NOT NULL AND row_count > 1)::integer,
    COALESCE(sum(row_count - 1) FILTER (WHERE duplicate_key IS NOT NULL AND row_count > 1), 0)::integer
  INTO contact_total, group_total, duplicate_total
  FROM grouped;

  INSERT INTO public.contact_merge_jobs (
    user_id,
    status,
    total_contacts,
    duplicate_groups,
    duplicate_contacts,
    progress_processed,
    completed_at,
    result
  )
  VALUES (
    requester_id,
    CASE WHEN duplicate_total = 0 THEN 'completed' ELSE 'queued' END,
    contact_total,
    group_total,
    duplicate_total,
    CASE WHEN duplicate_total = 0 THEN contact_total ELSE 0 END,
    CASE WHEN duplicate_total = 0 THEN now() ELSE NULL END,
    CASE
      WHEN duplicate_total = 0 THEN jsonb_build_object(
        'status', 'completed',
        'merged', 0,
        'groups', 0,
        'total_contacts', contact_total,
        'mode', 'database_transaction'
      )
      ELSE '{}'::jsonb
    END
  )
  RETURNING * INTO new_job;

  RETURN jsonb_build_object(
    'job_id', new_job.id,
    'status', new_job.status,
    'total_contacts', new_job.total_contacts,
    'duplicate_groups', new_job.duplicate_groups,
    'duplicate_contacts', new_job.duplicate_contacts,
    'reused', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.run_contact_merge_job(job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp, contact_ops, public
SET statement_timeout = '120s'
AS $$
DECLARE
  job public.contact_merge_jobs%ROWTYPE;
  caller_id uuid := auth.uid();
  caller_role text := COALESCE(auth.role(), '');
  merged_total integer := 0;
  group_total integer := 0;
  interaction_total integer := 0;
  relationship_total integer := 0;
  referrer_total integer := 0;
  insight_total integer := 0;
  error_detail text;
  final_result jsonb;
BEGIN
  SELECT *
  INTO job
  FROM public.contact_merge_jobs
  WHERE id = job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merge job not found' USING ERRCODE = 'P0002';
  END IF;

  IF caller_role <> 'service_role' AND caller_id IS DISTINCT FROM job.user_id THEN
    RAISE EXCEPTION 'Not allowed to run this merge job' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(job.user_id::text));

  SELECT *
  INTO job
  FROM public.contact_merge_jobs
  WHERE id = job_id
  FOR UPDATE;

  IF job.status = 'completed' THEN
    RETURN job.result || jsonb_build_object('job_id', job.id);
  END IF;

  IF job.status = 'canceled' THEN
    RETURN jsonb_build_object(
      'job_id', job.id,
      'status', 'canceled',
      'merged', 0,
      'groups', 0
    );
  END IF;

  UPDATE public.contact_merge_jobs
  SET status = 'running',
      started_at = COALESCE(started_at, now()),
      heartbeat_at = now(),
      completed_at = NULL,
      error_message = NULL,
      attempt_count = attempt_count + 1
  WHERE id = job.id;

  BEGIN
    CREATE TEMP TABLE merge_plan ON COMMIT DROP AS
    WITH keyed AS (
      SELECT
        c.id AS source_id,
        contact_ops.contact_duplicate_key(c.member_id, c.name) AS group_key,
        CASE WHEN contact_ops.contact_member_key(c.member_id) IS NULL THEN 'name' ELSE 'member' END AS group_kind,
        contact_ops.normalized_contact_member_id(c.member_id) AS normalized_member_id,
        c.created_at
      FROM public.contacts c
      WHERE c.user_id = job.user_id
        AND c.deleted_at IS NULL
    ),
    grouped AS (
      SELECT
        k.*,
        count(*) OVER (PARTITION BY k.group_key) AS group_size
      FROM keyed k
      WHERE k.group_key IS NOT NULL
    ),
    ranked AS (
      SELECT
        g.*,
        first_value(g.source_id) OVER (
          PARTITION BY g.group_key
          ORDER BY
            CASE
              WHEN g.group_kind = 'member' AND g.normalized_member_id ~ '-001$' THEN 0
              ELSE 1
            END,
            g.created_at,
            g.source_id
        ) AS primary_id
      FROM grouped g
      WHERE g.group_size > 1
    )
    SELECT source_id, primary_id, group_key, group_kind
    FROM ranked;

    CREATE INDEX ON merge_plan (source_id);
    CREATE INDEX ON merge_plan (primary_id);

    CREATE TEMP TABLE merge_map ON COMMIT DROP AS
    SELECT source_id AS duplicate_id, primary_id, group_key
    FROM merge_plan
    WHERE source_id <> primary_id;

    CREATE UNIQUE INDEX ON merge_map (duplicate_id);
    CREATE INDEX ON merge_map (primary_id);

    SELECT count(*)::integer, count(DISTINCT primary_id)::integer
    INTO merged_total, group_total
    FROM merge_map;

    IF merged_total = 0 THEN
      final_result := jsonb_build_object(
        'job_id', job.id,
        'status', 'completed',
        'merged', 0,
        'groups', 0,
        'total_contacts', job.total_contacts,
        'mode', 'database_transaction'
      );

      UPDATE public.contact_merge_jobs
      SET status = 'completed',
          duplicate_groups = 0,
          duplicate_contacts = 0,
          merged_contacts = 0,
          progress_processed = total_contacts,
          completed_at = now(),
          heartbeat_at = now(),
          result = final_result
      WHERE id = job.id;

      RETURN final_result;
    END IF;

    CREATE TEMP TABLE merge_rollup ON COMMIT DROP AS
    SELECT
      g.primary_id,
      max(c.name) FILTER (WHERE c.id = g.primary_id) AS name,
      max(c.member_id) FILTER (WHERE c.id = g.primary_id) AS member_id,
      COALESCE(
        (array_agg(NULLIF(btrim(c.nickname), '') ORDER BY COALESCE(c.updated_at, c.created_at) DESC, c.id)
          FILTER (WHERE NULLIF(btrim(c.nickname), '') IS NOT NULL))[1],
        NULL
      ) AS nickname,
      COALESCE(
        (array_agg(NULLIF(btrim(c.region), '') ORDER BY COALESCE(c.updated_at, c.created_at) DESC, c.id)
          FILTER (WHERE NULLIF(btrim(c.region), '') IS NOT NULL))[1],
        ''
      ) AS region,
      COALESCE(string_agg(DISTINCT NULLIF(btrim(c.background), ''), E'\n')
        FILTER (WHERE NULLIF(btrim(c.background), '') IS NOT NULL), '') AS background,
      COALESCE(string_agg(DISTINCT NULLIF(btrim(c.interest), ''), E'\n')
        FILTER (WHERE NULLIF(btrim(c.interest), '') IS NOT NULL), '') AS interest,
      CASE max(CASE c.heat WHEN 'loyal' THEN 3 WHEN 'hot' THEN 2 WHEN 'warm' THEN 1 ELSE 0 END)
        WHEN 3 THEN 'loyal'
        WHEN 2 THEN 'hot'
        WHEN 1 THEN 'warm'
        ELSE 'cold'
      END AS heat,
      COALESCE(
        (
          SELECT string_agg(lines.line, E'\n' ORDER BY lines.line)
          FROM (
            SELECT DISTINCT btrim(note_line) AS line
            FROM merge_plan mp_notes
            JOIN public.contacts c_notes ON c_notes.id = mp_notes.source_id
            CROSS JOIN LATERAL regexp_split_to_table(COALESCE(c_notes.notes, ''), E'\r?\n') AS note_line
            WHERE mp_notes.primary_id = g.primary_id
              AND btrim(note_line) <> ''
              AND btrim(note_line) !~ '^\[多經營權:'
          ) lines
        ),
        ''
      ) AS notes_without_rights,
      CASE
        WHEN count(DISTINCT NULLIF(btrim(c.member_id), '')) > 1 THEN
          '[多經營權: ' || string_agg(DISTINCT NULLIF(btrim(c.member_id), ''), ', ')
            FILTER (WHERE NULLIF(btrim(c.member_id), '') IS NOT NULL) || ']'
        ELSE ''
      END AS rights_note,
      COALESCE(string_agg(DISTINCT NULLIF(btrim(c.taboos), ''), E'\n')
        FILTER (WHERE NULLIF(btrim(c.taboos), '') IS NOT NULL), '') AS taboos,
      max(c.last_contact_date) AS last_contact_date,
      (
        array_agg(
          jsonb_build_object(
            'date', c.next_follow_up_date,
            'note', c.next_follow_up_note,
            'time', c.next_follow_up_time
          )
          ORDER BY c.next_follow_up_date, COALESCE(c.updated_at, c.created_at) DESC, c.id
        ) FILTER (WHERE c.next_follow_up_date IS NOT NULL)
      )[1] AS follow_up,
      (array_agg(NULLIF(btrim(c.contact_method), '') ORDER BY COALESCE(c.updated_at, c.created_at) DESC, c.id)
        FILTER (WHERE NULLIF(btrim(c.contact_method), '') IS NOT NULL))[1] AS contact_method,
      (array_agg(NULLIF(c.avatar_url, '') ORDER BY (c.id = g.primary_id) DESC, COALESCE(c.updated_at, c.created_at) DESC, c.id)
        FILTER (WHERE NULLIF(c.avatar_url, '') IS NOT NULL))[1] AS avatar_url,
      (array_agg(NULLIF(c.avatar_thumb_url, '') ORDER BY (c.id = g.primary_id) DESC, COALESCE(c.updated_at, c.created_at) DESC, c.id)
        FILTER (WHERE NULLIF(c.avatar_thumb_url, '') IS NOT NULL))[1] AS avatar_thumb_url,
      (array_agg(c.referrer_id ORDER BY (c.id = g.primary_id) DESC, COALESCE(c.updated_at, c.created_at) DESC, c.id)
        FILTER (WHERE c.referrer_id IS NOT NULL))[1] AS referrer_id,
      (array_agg(NULLIF(btrim(c.referrer_name), '') ORDER BY (c.id = g.primary_id) DESC, COALESCE(c.updated_at, c.created_at) DESC, c.id)
        FILTER (WHERE NULLIF(btrim(c.referrer_name), '') IS NOT NULL))[1] AS referrer_name,
      (array_agg(NULLIF(btrim(c.birthday), '') ORDER BY COALESCE(c.updated_at, c.created_at) DESC, c.id)
        FILTER (WHERE NULLIF(btrim(c.birthday), '') IS NOT NULL))[1] AS birthday,
      COALESCE(
        (array_agg(NULLIF(btrim(c.birthday_reminder), '') ORDER BY COALESCE(c.updated_at, c.created_at) DESC, c.id)
          FILTER (WHERE NULLIF(btrim(c.birthday_reminder), '') IS NOT NULL))[1],
        'none'
      ) AS birthday_reminder,
      (array_agg(NULLIF(btrim(c.gender), '') ORDER BY COALESCE(c.updated_at, c.created_at) DESC, c.id)
        FILTER (WHERE NULLIF(btrim(c.gender), '') IS NOT NULL))[1] AS gender
    FROM (SELECT DISTINCT primary_id FROM merge_plan) g
    JOIN merge_plan mp ON mp.primary_id = g.primary_id
    JOIN public.contacts c ON c.id = mp.source_id
    GROUP BY g.primary_id;

    UPDATE public.contacts primary_contact
    SET name = rollup.name,
        nickname = rollup.nickname,
        member_id = rollup.member_id,
        region = rollup.region,
        background = rollup.background,
        interest = rollup.interest,
        statuses = COALESCE((
          SELECT array_agg(DISTINCT status_value ORDER BY status_value)
          FROM merge_plan status_plan
          JOIN public.contacts status_contact ON status_contact.id = status_plan.source_id
          CROSS JOIN LATERAL unnest(COALESCE(status_contact.statuses, '{}'::text[])) AS status_value
          WHERE status_plan.primary_id = rollup.primary_id
        ), '{}'::text[]),
        heat = rollup.heat,
        notes = concat_ws(E'\n', NULLIF(rollup.notes_without_rights, ''), NULLIF(rollup.rights_note, '')),
        taboos = rollup.taboos,
        last_contact_date = rollup.last_contact_date,
        next_follow_up_date = (rollup.follow_up ->> 'date')::date,
        next_follow_up_note = rollup.follow_up ->> 'note',
        next_follow_up_time = rollup.follow_up ->> 'time',
        contact_method = rollup.contact_method,
        avatar_url = rollup.avatar_url,
        avatar_thumb_url = rollup.avatar_thumb_url,
        referrer_id = rollup.referrer_id,
        referrer_name = rollup.referrer_name,
        birthday = rollup.birthday,
        birthday_reminder = rollup.birthday_reminder,
        gender = rollup.gender,
        product_tags = COALESCE((
          SELECT array_agg(DISTINCT tag_value ORDER BY tag_value)
          FROM merge_plan tag_plan
          JOIN public.contacts tag_contact ON tag_contact.id = tag_plan.source_id
          CROSS JOIN LATERAL unnest(COALESCE(tag_contact.product_tags, '{}'::text[])) AS tag_value
          WHERE tag_plan.primary_id = rollup.primary_id
        ), '{}'::text[]),
        deleted_at = NULL
    FROM merge_rollup rollup
    WHERE primary_contact.id = rollup.primary_id
      AND primary_contact.user_id = job.user_id;

    INSERT INTO public.contact_insights (
      contact_id,
      user_id,
      summary,
      tags,
      next_action,
      invite_scripts,
      created_at,
      updated_at
    )
    SELECT
      g.primary_id,
      job.user_id,
      COALESCE((
        SELECT string_agg(summary_value, E'\n' ORDER BY summary_value)
        FROM (
          SELECT DISTINCT NULLIF(btrim(i_summary.summary), '') AS summary_value
          FROM merge_plan p_summary
          JOIN public.contact_insights i_summary ON i_summary.contact_id = p_summary.source_id
          WHERE p_summary.primary_id = g.primary_id
            AND NULLIF(btrim(i_summary.summary), '') IS NOT NULL
        ) summaries
      ), ''),
      COALESCE((
        SELECT array_agg(DISTINCT tag_value ORDER BY tag_value)
        FROM merge_plan p_tag
        JOIN public.contact_insights i_tag ON i_tag.contact_id = p_tag.source_id
        CROSS JOIN LATERAL unnest(COALESCE(i_tag.tags, '{}'::text[])) AS tag_value
        WHERE p_tag.primary_id = g.primary_id
      ), '{}'::text[]),
      COALESCE((
        SELECT i_action.next_action
        FROM merge_plan p_action
        JOIN public.contact_insights i_action ON i_action.contact_id = p_action.source_id
        WHERE p_action.primary_id = g.primary_id
          AND NULLIF(btrim(i_action.next_action), '') IS NOT NULL
        ORDER BY i_action.updated_at DESC, i_action.id
        LIMIT 1
      ), ''),
      COALESCE((
        SELECT jsonb_agg(DISTINCT script_value)
        FROM merge_plan p_script
        JOIN public.contact_insights i_script ON i_script.contact_id = p_script.source_id
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(i_script.invite_scripts) = 'array' THEN i_script.invite_scripts
            ELSE '[]'::jsonb
          END
        ) AS script_value
        WHERE p_script.primary_id = g.primary_id
      ), '[]'::jsonb),
      COALESCE((
        SELECT min(i_created.created_at)
        FROM merge_plan p_created
        JOIN public.contact_insights i_created ON i_created.contact_id = p_created.source_id
        WHERE p_created.primary_id = g.primary_id
      ), now()),
      now()
    FROM (SELECT DISTINCT primary_id FROM merge_plan) g
    WHERE EXISTS (
      SELECT 1
      FROM merge_plan p_exists
      JOIN public.contact_insights i_exists ON i_exists.contact_id = p_exists.source_id
      WHERE p_exists.primary_id = g.primary_id
    )
    ON CONFLICT (contact_id) DO UPDATE
    SET summary = EXCLUDED.summary,
        tags = EXCLUDED.tags,
        next_action = EXCLUDED.next_action,
        invite_scripts = EXCLUDED.invite_scripts,
        updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS insight_total = ROW_COUNT;

    INSERT INTO public.contact_relationships (
      user_id,
      contact_id,
      related_contact_id,
      relation_type,
      created_at
    )
    SELECT DISTINCT ON (remapped.user_id, remapped.contact_id, remapped.related_contact_id)
      remapped.user_id,
      remapped.contact_id,
      remapped.related_contact_id,
      remapped.relation_type,
      remapped.created_at
    FROM (
      SELECT
        relation.user_id,
        COALESCE(contact_map.primary_id, relation.contact_id) AS contact_id,
        COALESCE(related_map.primary_id, relation.related_contact_id) AS related_contact_id,
        relation.relation_type,
        relation.created_at
      FROM public.contact_relationships relation
      LEFT JOIN merge_map contact_map ON contact_map.duplicate_id = relation.contact_id
      LEFT JOIN merge_map related_map ON related_map.duplicate_id = relation.related_contact_id
      WHERE relation.user_id = job.user_id
        AND (contact_map.duplicate_id IS NOT NULL OR related_map.duplicate_id IS NOT NULL)
    ) remapped
    WHERE remapped.contact_id <> remapped.related_contact_id
    ORDER BY remapped.user_id, remapped.contact_id, remapped.related_contact_id, remapped.created_at
    ON CONFLICT (user_id, contact_id, related_contact_id) DO NOTHING;

    GET DIAGNOSTICS relationship_total = ROW_COUNT;

    UPDATE public.interactions interaction
    SET contact_id = map.primary_id
    FROM merge_map map
    WHERE interaction.contact_id = map.duplicate_id
      AND interaction.user_id = job.user_id;

    GET DIAGNOSTICS interaction_total = ROW_COUNT;

    UPDATE public.contacts referred_contact
    SET referrer_id = map.primary_id,
        referrer_name = primary_contact.name
    FROM merge_map map
    JOIN public.contacts primary_contact ON primary_contact.id = map.primary_id
    WHERE referred_contact.user_id = job.user_id
      AND referred_contact.referrer_id = map.duplicate_id;

    GET DIAGNOSTICS referrer_total = ROW_COUNT;

    UPDATE public.contacts
    SET referrer_id = NULL,
        referrer_name = NULL
    WHERE user_id = job.user_id
      AND referrer_id = id;

    DELETE FROM public.contacts duplicate_contact
    USING merge_map map
    WHERE duplicate_contact.id = map.duplicate_id
      AND duplicate_contact.user_id = job.user_id;

    final_result := jsonb_build_object(
      'job_id', job.id,
      'status', 'completed',
      'merged', merged_total,
      'groups', group_total,
      'total_contacts', job.total_contacts,
      'transferred_interactions', interaction_total,
      'recreated_relationships', relationship_total,
      'updated_referrers', referrer_total,
      'merged_insights', insight_total,
      'mode', 'database_transaction'
    );

    UPDATE public.contact_merge_jobs
    SET status = 'completed',
        duplicate_groups = group_total,
        duplicate_contacts = merged_total,
        merged_contacts = merged_total,
        progress_processed = total_contacts,
        completed_at = now(),
        heartbeat_at = now(),
        result = final_result,
        error_message = NULL
    WHERE id = job.id;

    RETURN final_result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_detail = MESSAGE_TEXT;

    UPDATE public.contact_merge_jobs
    SET status = 'failed',
        completed_at = now(),
        heartbeat_at = now(),
        error_message = left(COALESCE(error_detail, 'Unknown merge error'), 2000),
        result = jsonb_build_object(
          'job_id', job.id,
          'status', 'failed',
          'merged', 0,
          'groups', 0,
          'error', left(COALESCE(error_detail, 'Unknown merge error'), 2000),
          'mode', 'database_transaction'
        )
    WHERE id = job.id;

    RETURN jsonb_build_object(
      'job_id', job.id,
      'status', 'failed',
      'merged', 0,
      'groups', 0,
      'error', left(COALESCE(error_detail, 'Unknown merge error'), 2000),
      'mode', 'database_transaction'
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.create_contact_merge_job() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.run_contact_merge_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_contact_merge_job() TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_contact_merge_job(uuid) TO authenticated, service_role;

COMMENT ON TABLE public.contact_merge_jobs IS
  'Durable duplicate-contact merge requests. Queued jobs are compatible with a future background worker.';

COMMENT ON FUNCTION public.create_contact_merge_job() IS
  'Creates or reuses the authenticated user''s queued duplicate-contact merge job.';

COMMENT ON FUNCTION public.run_contact_merge_job(uuid) IS
  'Atomically merges a queued job and preserves interactions, AI insights, referrals, and relationship edges.';