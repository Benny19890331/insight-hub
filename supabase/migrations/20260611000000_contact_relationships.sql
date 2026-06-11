-- 家人朋友關係連結表
-- relation_type 語意：「related_contact 是 contact 的 ___」（例：B 是 A 的父母）
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

CREATE INDEX IF NOT EXISTS idx_contact_relationships_contact
  ON public.contact_relationships (user_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_relationships_related
  ON public.contact_relationships (user_id, related_contact_id);

ALTER TABLE public.contact_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relationships"
  ON public.contact_relationships FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relationships"
  ON public.contact_relationships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relationships"
  ON public.contact_relationships FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own relationships"
  ON public.contact_relationships FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
