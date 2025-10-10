-- Phase 1.1: Add YouTube Integration to Barber Profiles
ALTER TABLE barber_profiles 
ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT,
ADD COLUMN IF NOT EXISTS featured_video_id TEXT,
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS live_video_id TEXT,
ADD COLUMN IF NOT EXISTS last_live_check TIMESTAMPTZ;

-- Create index for live check queries
CREATE INDEX IF NOT EXISTS idx_barber_youtube_channel 
ON barber_profiles(youtube_channel_id) 
WHERE youtube_channel_id IS NOT NULL;

-- Phase 1.2: Create Barber Stats View (Read-Optimized)
CREATE MATERIALIZED VIEW IF NOT EXISTS barber_stats AS
SELECT 
  bp.id as barber_id,
  bp.user_id,
  bp.name,
  COUNT(DISTINCT cf.follower_id) as follower_count,
  COUNT(DISTINCT cl.user_id) as like_count,
  COUNT(DISTINCT cs.user_id) as subscription_count,
  COALESCE(SUM(d.amount_cents), 0) as total_donations_cents,
  COUNT(DISTINCT d.id) as donation_count
FROM barber_profiles bp
LEFT JOIN creator_follows cf ON cf.creator_id = bp.user_id
LEFT JOIN creator_likes cl ON cl.creator_id = bp.user_id
LEFT JOIN creator_subscriptions cs ON cs.creator_id = bp.user_id
LEFT JOIN donations d ON d.creator_id = bp.user_id AND d.status = 'paid'
GROUP BY bp.id, bp.user_id, bp.name;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_barber_stats_barber_id 
ON barber_stats(barber_id);

-- Function to refresh stats
CREATE OR REPLACE FUNCTION refresh_barber_stats()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY barber_stats;
END;
$$;