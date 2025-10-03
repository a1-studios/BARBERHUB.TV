-- Remove the view that triggered security warning
-- We'll use the get_public_profile function instead
DROP VIEW IF EXISTS public.public_profiles;

-- The get_public_profile function is safe because:
-- 1. It only returns non-sensitive fields
-- 2. It's explicitly designed for public access
-- 3. It's well documented what data it exposes