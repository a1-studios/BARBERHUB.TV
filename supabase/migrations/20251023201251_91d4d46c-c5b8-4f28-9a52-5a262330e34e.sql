-- Fix security: Set search_path for refresh function
CREATE OR REPLACE FUNCTION refresh_barber_stats_on_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY barber_stats;
  RETURN COALESCE(NEW, OLD);
END;
$$;