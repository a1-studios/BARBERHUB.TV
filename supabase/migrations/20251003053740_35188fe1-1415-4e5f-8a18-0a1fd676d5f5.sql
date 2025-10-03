-- Create a function to fetch multiple public profiles at once
-- This is more efficient than calling get_public_profile_info multiple times
CREATE OR REPLACE FUNCTION public.get_multiple_public_profiles(user_ids UUID[])
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  user_type TEXT,
  country_code TEXT,
  is_creator BOOLEAN,
  creator_level TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.bio,
    p.user_type,
    p.country_code,
    p.is_creator,
    p.creator_level
  FROM public.profiles p
  WHERE p.user_id = ANY(user_ids);
$$;

COMMENT ON FUNCTION public.get_multiple_public_profiles IS 'Returns public profile information for multiple users. Does not expose sensitive financial data.';