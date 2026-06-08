
CREATE OR REPLACE FUNCTION public.sync_contact_last_contact_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_max date;
BEGIN
  v_contact_id := COALESCE(NEW.contact_id, OLD.contact_id);
  SELECT MAX(date) INTO v_max FROM public.interactions WHERE contact_id = v_contact_id;
  UPDATE public.contacts
    SET last_contact_date = COALESCE(v_max, last_contact_date),
        updated_at = now()
    WHERE id = v_contact_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_interactions_sync_contact ON public.interactions;
CREATE TRIGGER trg_interactions_sync_contact
AFTER INSERT OR UPDATE OR DELETE ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.sync_contact_last_contact_date();

-- Backfill any contacts whose last_contact_date is older than their latest interaction
UPDATE public.contacts c
SET last_contact_date = sub.max_date,
    updated_at = now()
FROM (
  SELECT contact_id, MAX(date) AS max_date
  FROM public.interactions
  GROUP BY contact_id
) sub
WHERE c.id = sub.contact_id
  AND (c.last_contact_date IS NULL OR c.last_contact_date < sub.max_date);
