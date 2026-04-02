
-- Add location columns to barber_profiles
ALTER TABLE barber_profiles
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS location_sharing_enabled BOOLEAN NOT NULL DEFAULT false;

-- Seed enforce_tiers platform state (OFF by default for QA)
INSERT INTO platform_state (key, value)
VALUES ('enforce_tiers', 'false')
ON CONFLICT (key) DO NOTHING;

-- Create proximity RPC function
CREATE OR REPLACE FUNCTION find_barbers_nearby(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_miles NUMERIC DEFAULT 15,
  p_enforce_tiers BOOLEAN DEFAULT false
)
RETURNS TABLE (
  barber_id UUID,
  user_id UUID,
  name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  specialty TEXT,
  active_subscription_tier TEXT,
  location TEXT,
  avatar_url TEXT,
  distance_miles NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bp.id AS barber_id,
    bp.user_id,
    bp.name,
    bp.latitude,
    bp.longitude,
    bp.specialty,
    bp.active_subscription_tier,
    bp.location,
    p.avatar_url,
    (3959 * acos(
      cos(radians(p_lat)) * cos(radians(bp.latitude))
      * cos(radians(bp.longitude) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(bp.latitude))
    ))::NUMERIC AS distance_miles
  FROM barber_profiles bp
  JOIN profiles p ON p.user_id = bp.user_id
  WHERE bp.location_sharing_enabled = true
    AND bp.latitude IS NOT NULL
    AND bp.longitude IS NOT NULL
    AND (
      NOT p_enforce_tiers
      OR bp.active_subscription_tier IN ('silver', 'gold', 'diamond')
    )
    AND (3959 * acos(
      cos(radians(p_lat)) * cos(radians(bp.latitude))
      * cos(radians(bp.longitude) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(bp.latitude))
    )) <= p_radius_miles
  ORDER BY distance_miles ASC;
$$;
