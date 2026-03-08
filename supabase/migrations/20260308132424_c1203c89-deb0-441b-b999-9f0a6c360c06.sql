
CREATE TABLE public.contact_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  summary text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  next_action text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (contact_id)
);

ALTER TABLE public.contact_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON public.contact_insights FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON public.contact_insights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON public.contact_insights FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own insights" ON public.contact_insights FOR DELETE TO authenticated USING (auth.uid() = user_id);
