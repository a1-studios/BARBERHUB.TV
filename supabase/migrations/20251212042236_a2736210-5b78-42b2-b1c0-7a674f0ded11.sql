-- Fix functions with search_path (the first migration was applied but these still show without it)
-- Need to ensure SET search_path is included

-- Fix create_battle_notification 
DROP FUNCTION IF EXISTS public.create_battle_notification(uuid, text, text, text, jsonb);
CREATE FUNCTION public.create_battle_notification(
  p_user_id uuid, 
  p_type text, 
  p_title text, 
  p_message text, 
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Fix notify_battle_participants (4 param version)
DROP FUNCTION IF EXISTS public.notify_battle_participants(uuid, uuid, text, text);
CREATE FUNCTION public.notify_battle_participants(
  p_battle_id uuid, 
  p_winner_id uuid, 
  p_title text, 
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
BEGIN
  FOR v_participant IN 
    SELECT DISTINCT voter_id 
    FROM battle_votes 
    WHERE battle_id = p_battle_id
  LOOP
    PERFORM create_battle_notification(
      v_participant.voter_id,
      'battle_completed',
      p_title,
      p_message,
      jsonb_build_object(
        'battle_id', p_battle_id,
        'winner_id', p_winner_id
      )
    );
  END LOOP;
  
  FOR v_participant IN 
    SELECT user_id 
    FROM battle_participants 
    WHERE battle_id = p_battle_id
  LOOP
    PERFORM create_battle_notification(
      v_participant.user_id,
      'battle_result',
      p_title,
      CASE 
        WHEN v_participant.user_id = p_winner_id THEN '🎉 Congratulations! You won the battle!'
        ELSE 'Your battle has ended. Better luck next time!'
      END,
      jsonb_build_object(
        'battle_id', p_battle_id,
        'winner_id', p_winner_id,
        'is_winner', v_participant.user_id = p_winner_id
      )
    );
  END LOOP;
END;
$$;

-- Recreate views with security_invoker = true
-- First drop existing views
DROP VIEW IF EXISTS public.public_user_profiles CASCADE;
DROP VIEW IF EXISTS public.public_barber_profiles CASCADE;

-- Recreate public_user_profiles with security invoker
CREATE VIEW public.public_user_profiles 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  display_name,
  username,
  avatar_url,
  user_type
FROM profiles;

GRANT SELECT ON public.public_user_profiles TO authenticated, anon;

-- Recreate public_barber_profiles with security invoker
CREATE VIEW public.public_barber_profiles
WITH (security_invoker = true)
AS
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
  SELECT creator_id, count(*) AS followers
  FROM creator_follows
  GROUP BY creator_id
) cf ON cf.creator_id = bp.user_id
LEFT JOIN (
  SELECT creator_id, count(*) AS likes
  FROM creator_likes
  GROUP BY creator_id
) cl ON cl.creator_id = bp.user_id
LEFT JOIN (
  SELECT creator_id, count(*) AS subs
  FROM creator_subscriptions
  GROUP BY creator_id
) cs ON cs.creator_id = bp.user_id
LEFT JOIN (
  SELECT creator_id, sum(amount_cents) AS total_donated
  FROM donations
  WHERE status = 'paid'
  GROUP BY creator_id
) d ON d.creator_id = bp.user_id;

GRANT SELECT ON public.public_barber_profiles TO authenticated, anon;