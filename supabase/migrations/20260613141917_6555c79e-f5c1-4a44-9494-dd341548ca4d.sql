
-- Optimize RLS: wrap auth.uid() in subselect so it's evaluated once per query, not per row
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own contacts" ON public.contacts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING ((select auth.uid()) = user_id);

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='interactions' LOOP
    EXECUTE format('DROP POLICY %I ON public.interactions', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own interactions" ON public.interactions FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own interactions" ON public.interactions FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own interactions" ON public.interactions FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own interactions" ON public.interactions FOR DELETE USING ((select auth.uid()) = user_id);

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='contact_insights' LOOP
    EXECUTE format('DROP POLICY %I ON public.contact_insights', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own insights" ON public.contact_insights FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own insights" ON public.contact_insights FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own insights" ON public.contact_insights FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own insights" ON public.contact_insights FOR DELETE USING ((select auth.uid()) = user_id);

-- Indexes for the hot read paths
CREATE INDEX IF NOT EXISTS idx_contacts_user_active_created
  ON public.contacts (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_interactions_user_date
  ON public.interactions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_contact_insights_user
  ON public.contact_insights (user_id);
