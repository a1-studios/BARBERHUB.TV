-- Add RLS policies to underlying tables to support the security invoker views
-- First drop existing policies if they exist, then create new ones

DO $$
BEGIN
  -- Drop existing profile select policy if exists
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Public barber profiles are viewable by everyone" ON public.barber_profiles;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create profile read policy for public access
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (true);

-- Create barber profile read policy for public directory
CREATE POLICY "Public barber profiles are viewable by everyone"
ON public.barber_profiles
FOR SELECT
TO authenticated, anon
USING (true);