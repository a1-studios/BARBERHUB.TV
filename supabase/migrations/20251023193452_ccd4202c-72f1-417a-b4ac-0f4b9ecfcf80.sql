-- Create a SECURITY DEFINER function to get public barber profiles with all necessary data
-- This bypasses RLS on profiles table for public read-only data
CREATE OR REPLACE FUNCTION public.get_public_barber_profiles()
RETURNS TABLE (
  barber_id UUID,
  user_id UUID,
  name TEXT,
  rating NUMERIC,
  country_code TEXT,
  location TEXT,
  display_name TEXT,
  avatar_url TEXT,
  follower_count BIGINT,
  like_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id AS barber_id,
    bp.user_id,
    bp.name,
    bp.rating,
    bp.country_code,
    bp.location,
    p.display_name,
    p.avatar_url,
    COALESCE(bs.followers, 0) AS follower_count,
    COALESCE(bs.likes, 0) AS like_count
  FROM barber_profiles bp
  LEFT JOIN profiles p ON p.user_id = bp.user_id
  LEFT JOIN barber_stats bs ON bs.barber_id = bp.id
  ORDER BY bp.rating DESC NULLS LAST;
END;
$$;