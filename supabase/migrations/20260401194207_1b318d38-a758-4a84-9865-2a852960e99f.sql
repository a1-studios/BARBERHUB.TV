
CREATE OR REPLACE FUNCTION public.assign_social_auth_role(p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  IF p_role NOT IN ('barber', 'fan') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  SELECT display_name, avatar_url INTO v_display_name, v_avatar_url
  FROM profiles
  WHERE user_id = p_user_id;

  UPDATE profiles
  SET user_type = p_role, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF p_role = 'barber' THEN
    INSERT INTO barber_profiles (user_id, name)
    VALUES (p_user_id, COALESCE(v_display_name, 'Barber'))
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF p_role = 'fan' THEN
    INSERT INTO client_profiles (user_id, username, avatar_url)
    VALUES (p_user_id, COALESCE(v_display_name, 'Fan'), v_avatar_url)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;
