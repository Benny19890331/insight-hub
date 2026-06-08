ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON public.contacts(user_id, deleted_at);