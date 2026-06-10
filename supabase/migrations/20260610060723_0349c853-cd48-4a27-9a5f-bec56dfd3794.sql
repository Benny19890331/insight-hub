CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_logs_user_created_idx ON public.ai_usage_logs(user_id, created_at DESC);
GRANT INSERT, SELECT ON public.ai_usage_logs TO service_role;
GRANT ALL ON public.ai_usage_logs TO service_role;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view ai usage" ON public.ai_usage_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));