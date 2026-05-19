
CREATE OR REPLACE FUNCTION public.find_barbers_nearby_scored(
  p_lat numeric,
  p_lng numeric,
  p_radius_miles numeric DEFAULT 15,
  p_enforce_tiers boolean DEFAULT false
)
RETURNS TABLE(
  barber_id uuid,
  user_id uuid,
  name text,
  latitude numeric,
  longitude numeric,
  specialty text,
  active_subscription_tier text,
  location text,
  avatar_url text,
  distance_miles numeric,
  bb_purchased numeric,
  battles_participated bigint,
  contribution_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM (
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
      ))::NUMERIC AS distance_miles,
      COALESCE(bb.purchased, 0)::NUMERIC AS bb_purchased,
      COALESCE(part.battles, 0)::BIGINT AS battles_participated,
      (COALESCE(bp.m4m_lives_touched, 0) + COALESCE(bp.total_stream_minutes, 0) / 60.0)::NUMERIC AS contribution_score
    FROM barber_profiles bp
    JOIN profiles p ON p.user_id = bp.user_id
    LEFT JOIN (
      SELECT user_id, SUM(amount) AS purchased
      FROM barber_bucks_transactions
      WHERE transaction_type = 'purchase'
      GROUP BY user_id
    ) bb ON bb.user_id = bp.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS battles
      FROM battle_participants
      GROUP BY user_id
    ) part ON part.user_id = bp.user_id
    WHERE bp.location_sharing_enabled = true
      AND bp.latitude IS NOT NULL
      AND bp.longitude IS NOT NULL
      AND (NOT p_enforce_tiers OR bp.active_subscription_tier IN ('silver','gold','diamond'))
  ) q
  WHERE q.distance_miles <= p_radius_miles
  ORDER BY q.distance_miles ASC;
$$;
