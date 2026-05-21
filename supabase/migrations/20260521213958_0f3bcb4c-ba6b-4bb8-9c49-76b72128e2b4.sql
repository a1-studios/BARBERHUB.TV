
-- 1. Make sync_user_binary_role non-destructive
CREATE OR REPLACE FUNCTION public.sync_user_binary_role(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_display_name text;
  v_country_code text;
  v_avatar_url text;
BEGIN
  IF p_role NOT IN ('barber', 'fan') THEN
    RAISE EXCEPTION 'Invalid binary role: %', p_role;
  END IF;

  SELECT display_name, country_code, avatar_url
    INTO v_display_name, v_country_code, v_avatar_url
  FROM public.profiles
  WHERE user_id = p_user_id;

  UPDATE public.profiles
     SET user_type = p_role,
         updated_at = now()
   WHERE user_id = p_user_id;

  DELETE FROM public.user_roles
   WHERE user_id = p_user_id
     AND role IN ('barber'::app_role, 'fan'::app_role)
     AND role <> p_role::app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF p_role = 'barber' THEN
    IF NOT EXISTS (SELECT 1 FROM public.barber_profiles WHERE user_id = p_user_id) THEN
      INSERT INTO public.barber_profiles (user_id, name, country_code)
      VALUES (p_user_id, COALESCE(v_display_name, 'Barber'), v_country_code);
    ELSE
      UPDATE public.barber_profiles
         SET country_code = COALESCE(country_code, v_country_code)
       WHERE user_id = p_user_id;
    END IF;
    -- NOTE: do NOT delete client_profiles. Preserve historical data.
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.client_profiles WHERE user_id = p_user_id) THEN
      INSERT INTO public.client_profiles (user_id, username, avatar_url)
      VALUES (p_user_id, COALESCE(v_display_name, 'Fan'), v_avatar_url);
    END IF;
    -- NOTE: do NOT delete barber_profiles. Preserves portfolios/creations/submissions.
  END IF;
END;
$function$;

-- 2. Defensive: replace CASCADE with RESTRICT on media tables
ALTER TABLE public.creations
  DROP CONSTRAINT IF EXISTS creations_barber_id_fkey,
  ADD CONSTRAINT creations_barber_id_fkey
    FOREIGN KEY (barber_id) REFERENCES public.barber_profiles(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creator_content_creator_id_fkey'
      AND conrelid = 'public.creator_content'::regclass
  ) THEN
    ALTER TABLE public.creator_content
      DROP CONSTRAINT creator_content_creator_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'battle_submissions_user_id_fkey'
      AND conrelid = 'public.battle_submissions'::regclass
  ) THEN
    ALTER TABLE public.battle_submissions
      DROP CONSTRAINT battle_submissions_user_id_fkey;
  END IF;
END $$;
