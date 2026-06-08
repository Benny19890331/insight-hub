ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_contacts_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_touch_updated_at ON public.contacts;
CREATE TRIGGER trg_contacts_touch_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.touch_contacts_updated_at();

UPDATE public.contacts SET updated_at = COALESCE(updated_at, created_at, now());

CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON public.contacts (user_id, updated_at DESC);