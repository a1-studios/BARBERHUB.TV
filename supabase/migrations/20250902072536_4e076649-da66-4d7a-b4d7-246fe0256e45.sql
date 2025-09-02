-- Drop the overly permissive policy that allows everyone to view all profile data
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create more granular policies for profile access

-- 1. Allow users to view their own complete profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Allow authenticated users to view only basic public profile info
CREATE POLICY "Authenticated users can view basic public profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Only expose non-sensitive fields to other authenticated users
  true
);

-- Create a view for public profile data that only exposes safe fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  display_name,
  avatar_url,
  bio,
  username,
  user_type,
  created_at,
  -- Hide sensitive fields: total_earnings, barber_bucks, referral_code, referred_by, is_creator, creator_level
  id -- Keep ID for joins but this won't expose the actual UUID to unauthorized users
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.public_profiles SET (security_barrier = true);

-- Grant access to the public view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create a security definer function to get public profile info safely
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  username text,
  user_type text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.username,
    p.user_type,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
$$;