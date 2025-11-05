-- Update handle_new_user trigger to create specialized profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_display_name TEXT;
  v_country_code TEXT;
BEGIN
  -- Extract metadata
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'fan');
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);
  v_country_code := NEW.raw_user_meta_data->>'country_code';
  
  -- Insert into profiles
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    user_type,
    country_code
  ) VALUES (
    NEW.id,
    v_display_name,
    v_user_type,
    v_country_code
  );
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_user_type::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create specialized profile based on role
  IF v_user_type = 'barber' THEN
    INSERT INTO public.barber_profiles (
      user_id, 
      name,
      country_code
    ) VALUES (
      NEW.id, 
      v_display_name,
      v_country_code
    );
  ELSIF v_user_type = 'fan' THEN
    INSERT INTO public.client_profiles (
      user_id, 
      username,
      avatar_url
    ) VALUES (
      NEW.id,
      v_display_name,
      NEW.raw_user_meta_data->>'avatar_url'
    );
  END IF;
  
  RETURN NEW;
END;
$$;