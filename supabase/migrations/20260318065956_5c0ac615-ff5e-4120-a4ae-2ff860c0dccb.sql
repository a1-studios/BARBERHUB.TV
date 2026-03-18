
-- RPC to atomically increment client appointment counters
CREATE OR REPLACE FUNCTION public.increment_client_appointments(p_client_id uuid, p_is_no_show boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE client_profiles
  SET 
    total_appointments = COALESCE(total_appointments, 0) + 1,
    no_show_count = CASE WHEN p_is_no_show THEN COALESCE(no_show_count, 0) + 1 ELSE no_show_count END
  WHERE user_id = p_client_id;
END;
$$;
