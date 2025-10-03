-- Phase 2: Fix RLS Policy Conflicts on profiles table
-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "Authenticated users can view limited profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create separate policies for public vs private profile data
-- Policy 1: Public profile information (display name, avatar, bio, user type)
-- This allows users to see basic profile info of other users for social features
CREATE POLICY "Public profile info is viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);

-- However, we need to ensure sensitive columns are protected
-- Create a view for public profile data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  display_name,
  username,
  avatar_url,
  bio,
  user_type,
  country_code,
  is_creator,
  creator_level,
  created_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- Now update the profiles policy to be more restrictive
-- Users can only see their OWN full profile data (including sensitive fields)
DROP POLICY IF EXISTS "Public profile info is viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security definer function to get public profile info safely
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id UUID)
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
  WHERE p.user_id = profile_user_id;
$$;

-- Add comment explaining the security model
COMMENT ON TABLE public.profiles IS 'Contains user profile data. Sensitive fields (barber_bucks, total_earnings, referral_code, three_x_vote_expires_at, is_verified_by_competition) are only visible to the profile owner. Use get_public_profile() function or public_profiles view to access non-sensitive data of other users.';

COMMENT ON FUNCTION public.get_public_profile IS 'Returns only public profile information (no sensitive financial or verification data). Safe to call for any user profile.';