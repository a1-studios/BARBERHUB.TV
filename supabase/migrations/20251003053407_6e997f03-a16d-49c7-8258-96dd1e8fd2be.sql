-- Update validate_user_action function to use has_role
CREATE OR REPLACE FUNCTION public.validate_user_action(action_type text, target_user_type text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate action matches user role
  CASE action_type
    WHEN 'create_battle' THEN
      RETURN public.has_role(auth.uid(), 'barber');
    WHEN 'vote' THEN
      RETURN public.has_role(auth.uid(), 'fan');
    WHEN 'create_content' THEN
      RETURN public.has_role(auth.uid(), 'barber');
    ELSE
      RETURN false;
  END CASE;
END;
$$;