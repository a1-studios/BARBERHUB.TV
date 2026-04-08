
-- Drop and recreate the public_user_profiles view with safe columns only
DROP VIEW IF EXISTS public.public_user_profiles;

CREATE VIEW public.public_user_profiles AS
SELECT
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  is_creator,
  creator_level,
  user_type,
  country_code,
  favorite_creator_id,
  is_verified_by_competition,
  sub_category,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_user_profiles TO anon, authenticated;

-- Ensure authenticated users can still read profiles directly
-- (the "Public profiles are viewable by everyone" was already dropped in previous migration)
-- Check if authenticated policy exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Authenticated users can view profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Revoke direct anon SELECT on profiles table (anon uses the view instead)
REVOKE SELECT ON public.profiles FROM anon;

-- FIX 2: Remove permissive anon UPDATE on marketing_leads
DROP POLICY IF EXISTS "Anon can update leads" ON public.marketing_leads;
DROP POLICY IF EXISTS "Block anon update on marketing_leads" ON public.marketing_leads;
