CREATE TABLE IF NOT EXISTS public.contact_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    related_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    relation_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT no_self_relation CHECK (contact_id <> related_contact_id),
    CONSTRAINT uniq_relation UNIQUE (user_id, contact_id, related_contact_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_relationships TO authenticated;
GRANT ALL ON public.contact_relationships TO service_role;

ALTER TABLE public.contact_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relationships" ON public.contact_relationships FOR SELECT TO authenticated USING
(auth.uid() = user_id);

CREATE POLICY "Users can insert own relationships" ON public.contact_relationships FOR INSERT TO authenticated WITH
CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own relationships" ON public.contact_relationships FOR DELETE TO authenticated USING
(auth.uid() = user_id);