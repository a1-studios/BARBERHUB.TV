-- Function to sync country_code from profiles to barber_profiles
CREATE OR REPLACE FUNCTION sync_country_code_to_barber_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- When country_code is updated in profiles, also update barber_profiles
  IF (OLD.country_code IS DISTINCT FROM NEW.country_code) THEN
    UPDATE barber_profiles
    SET country_code = NEW.country_code
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Trigger on profiles table
CREATE TRIGGER sync_country_to_barber
AFTER UPDATE OF country_code ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_country_code_to_barber_profile();

-- Also sync in reverse: barber_profiles -> profiles
CREATE OR REPLACE FUNCTION sync_country_code_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.country_code IS DISTINCT FROM NEW.country_code) THEN
    UPDATE profiles
    SET country_code = NEW.country_code
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER sync_country_to_profile
AFTER UPDATE OF country_code ON barber_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_country_code_to_profile();

-- Drop and recreate the public_barber_profiles view with simplified country_code logic
DROP VIEW IF EXISTS public_barber_profiles;

CREATE VIEW public_barber_profiles AS
SELECT 
  bp.id AS barber_id,
  bp.user_id,
  bp.name AS barber_name,
  bp.location,
  bp.specialty,
  bp.bio AS barber_bio,
  bp.portfolio_url,
  bp.is_live,
  bp.years_experience,
  bp.rating,
  bp.featured_video_id,
  bp.live_video_id,
  bp.youtube_channel_id,
  bp.last_live_check,
  bp.created_at AS barber_created_at,
  bp.updated_at AS barber_updated_at,
  COALESCE(bp.country_code, p.country_code, 'XX') AS country_code,
  p.display_name,
  p.username,
  p.avatar_url,
  p.bio AS user_bio,
  COALESCE(cf.followers, 0) AS follower_count,
  COALESCE(cl.likes, 0) AS like_count,
  COALESCE(cs.subs, 0) AS subscription_count,
  COALESCE(d.total_donated, 0) AS total_donations_cents
FROM barber_profiles bp
LEFT JOIN profiles p ON p.user_id = bp.user_id
LEFT JOIN (
  SELECT creator_id, COUNT(*) AS followers
  FROM creator_follows
  GROUP BY creator_id
) cf ON cf.creator_id = bp.user_id
LEFT JOIN (
  SELECT creator_id, COUNT(*) AS likes
  FROM creator_likes
  GROUP BY creator_id
) cl ON cl.creator_id = bp.user_id
LEFT JOIN (
  SELECT creator_id, COUNT(*) AS subs
  FROM creator_subscriptions
  GROUP BY creator_id
) cs ON cs.creator_id = bp.user_id
LEFT JOIN (
  SELECT creator_id, SUM(amount_cents) AS total_donated
  FROM donations
  WHERE status = 'paid'
  GROUP BY creator_id
) d ON d.creator_id = bp.user_id;

-- One-time sync: Copy existing barber_profiles.country_code to profiles where NULL
UPDATE profiles p
SET country_code = bp.country_code
FROM barber_profiles bp
WHERE p.user_id = bp.user_id
  AND p.country_code IS NULL
  AND bp.country_code IS NOT NULL;