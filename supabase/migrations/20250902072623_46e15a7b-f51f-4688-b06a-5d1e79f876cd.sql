-- Remove the problematic security definer view and function
DROP VIEW IF EXISTS public.public_profiles;
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

-- Update the RLS policy to be more restrictive - only allow authenticated users to see basic profile info
-- Keep the current policies but make them more specific about what fields can be accessed
DROP POLICY IF EXISTS "Authenticated users can view basic public profile info" ON public.profiles;

-- Create a more specific policy that restricts sensitive data access
CREATE POLICY "Authenticated users can view limited profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    -- Users can see their own full profile
    auth.uid() = user_id OR
    -- Others can only see these fields through application logic, not direct queries
    false
  )
);

-- Since we can't use views with security definer, we'll handle the security in application logic
-- The RLS policy now ensures only authenticated users can access profiles
-- and only their own full profile data