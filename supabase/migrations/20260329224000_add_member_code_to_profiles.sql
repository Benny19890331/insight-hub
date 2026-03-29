ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS member_code TEXT DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, member_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'member_code', '')), '')
  );
  RETURN NEW;
END;
$$;