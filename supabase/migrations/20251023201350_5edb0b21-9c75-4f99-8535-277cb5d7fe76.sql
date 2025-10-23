-- Phase 2: Create Unified Public Barber Profiles View

-- Create helper function for country code normalization
CREATE OR REPLACE FUNCTION normalize_country_code(
  code TEXT,
  name TEXT DEFAULT NULL,
  location TEXT DEFAULT NULL
) RETURNS TEXT 
LANGUAGE plpgsql 
IMMUTABLE 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code TEXT;
BEGIN
  -- Trim and uppercase
  normalized_code := UPPER(TRIM(COALESCE(code, '')));
  
  -- Handle empty strings
  IF normalized_code = '' THEN
    -- Try to infer from name or location
    IF location ILIKE '%dominican%' OR location ILIKE '%santiago%' OR name ILIKE '%rd%' OR location ILIKE '%rd%' THEN
      RETURN 'DO';
    END IF;
    RETURN 'XX';
  END IF;
  
  -- Fix common aliases
  CASE normalized_code
    WHEN 'DR' THEN RETURN 'DO';  -- Dominican Republic
    WHEN 'UK' THEN RETURN 'GB';  -- United Kingdom
    WHEN 'UAE' THEN RETURN 'AE'; -- United Arab Emirates
    WHEN 'KSA' THEN RETURN 'SA'; -- Saudi Arabia
    WHEN 'USA' THEN RETURN 'US'; -- United States
    WHEN 'ENG', 'SCO', 'WAL', 'NIR' THEN RETURN 'GB'; -- UK regions
    ELSE
      -- Valid 2-letter code
      IF LENGTH(normalized_code) = 2 THEN
        RETURN normalized_code;
      END IF;
      
      -- 3-letter codes
      CASE normalized_code
        WHEN 'DOM' THEN RETURN 'DO';
        WHEN 'GBR' THEN RETURN 'GB';
        WHEN 'ARE' THEN RETURN 'AE';
        ELSE RETURN 'XX';
      END CASE;
  END CASE;
END;
$$;

-- Create unified public barber profiles view
CREATE OR REPLACE VIEW public_barber_profiles AS
SELECT 
  bp.id as barber_id,
  bp.user_id,
  bp.name as barber_name,
  bp.location,
  COALESCE(bp.country_code, p.country_code) as country_code,
  bp.rating,
  bp.specialty,
  bp.bio as barber_bio,
  bp.years_experience,
  bp.portfolio_url,
  bp.youtube_channel_id,
  bp.is_live,
  bp.live_video_id,
  bp.featured_video_id,
  bp.last_live_check,
  bp.created_at as barber_created_at,
  bp.updated_at as barber_updated_at,
  p.display_name,
  p.avatar_url,
  p.bio as user_bio,
  p.username,
  COALESCE(bs.follower_count, 0) as follower_count,
  COALESCE(bs.like_count, 0) as like_count,
  COALESCE(bs.subscription_count, 0) as subscription_count,
  COALESCE(bs.total_donations_cents, 0) as total_donations_cents
FROM barber_profiles bp
LEFT JOIN profiles p ON p.user_id = bp.user_id
LEFT JOIN barber_stats bs ON bs.barber_id = bp.id;

-- Grant SELECT to authenticated and anonymous users
GRANT SELECT ON public_barber_profiles TO authenticated;
GRANT SELECT ON public_barber_profiles TO anon;

-- One-time data cleanup: Fix elduro-rd's country code
UPDATE barber_profiles 
SET country_code = 'DO' 
WHERE name = 'elduro-rd' AND (country_code IS NULL OR country_code = '');