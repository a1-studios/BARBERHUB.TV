
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_type TEXT;
  v_display_name TEXT;
  v_country_code TEXT;
  v_phone TEXT;
  v_lead RECORD;
BEGIN
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'fan');
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);
  v_country_code := NEW.raw_user_meta_data->>'country_code';
  v_phone := NEW.raw_user_meta_data->>'phone_number';

  -- Pull onboarding lead data (phone/country) captured before signup
  SELECT phone_number, country_code
    INTO v_lead
  FROM public.marketing_leads
  WHERE lower(email) = lower(NEW.email)
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_phone IS NULL OR v_phone = '' THEN
    v_phone := v_lead.phone_number;
  END IF;
  IF v_country_code IS NULL OR v_country_code = '' THEN
    v_country_code := v_lead.country_code;
  END IF;

  INSERT INTO public.profiles (
    user_id, display_name, user_type, country_code, phone_number
  ) VALUES (
    NEW.id, v_display_name, v_user_type, v_country_code, v_phone
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_user_type::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_user_type = 'barber' THEN
    INSERT INTO public.barber_profiles (
      user_id, name, country_code, phone_number
    ) VALUES (
      NEW.id, v_display_name, v_country_code, v_phone
    );
  ELSIF v_user_type = 'fan' THEN
    INSERT INTO public.client_profiles (
      user_id, username, avatar_url
    ) VALUES (
      NEW.id, v_display_name, NEW.raw_user_meta_data->>'avatar_url'
    );
  END IF;

  RETURN NEW;
END;
$function$;
