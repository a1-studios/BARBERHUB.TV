-- Fix: Remove SECURITY DEFINER from view, use security_invoker instead
DROP VIEW IF EXISTS public_barber_profiles;

CREATE VIEW public_barber_profiles 
WITH (security_invoker = false) AS
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