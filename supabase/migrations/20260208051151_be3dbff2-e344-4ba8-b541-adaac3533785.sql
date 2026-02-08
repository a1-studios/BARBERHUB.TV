
-- Drop and recreate the view with social media columns included
DROP VIEW IF EXISTS public_barber_profiles;

CREATE VIEW public_barber_profiles AS
SELECT bp.id AS barber_id,
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
    COALESCE(bp.country_code, p.country_code, 'XX'::text) AS country_code,
    p.display_name,
    p.username,
    p.avatar_url,
    p.bio AS user_bio,
    bp.instagram_handle,
    bp.facebook_handle,
    bp.twitter_handle,
    bp.youtube_handle,
    COALESCE(cf.followers, 0::bigint) AS follower_count,
    COALESCE(cl.likes, 0::bigint) AS like_count,
    COALESCE(cs.subs, 0::bigint) AS subscription_count,
    COALESCE(d.total_donated, 0::bigint) AS total_donations_cents
   FROM barber_profiles bp
     LEFT JOIN profiles p ON p.user_id = bp.user_id
     LEFT JOIN ( SELECT creator_follows.creator_id,
            count(*) AS followers
           FROM creator_follows
          GROUP BY creator_follows.creator_id) cf ON cf.creator_id = bp.user_id
     LEFT JOIN ( SELECT creator_likes.creator_id,
            count(*) AS likes
           FROM creator_likes
          GROUP BY creator_likes.creator_id) cl ON cl.creator_id = bp.user_id
     LEFT JOIN ( SELECT creator_subscriptions.creator_id,
            count(*) AS subs
           FROM creator_subscriptions
          GROUP BY creator_subscriptions.creator_id) cs ON cs.creator_id = bp.user_id
     LEFT JOIN ( SELECT donations.creator_id,
            sum(donations.amount_cents) AS total_donated
           FROM donations
          WHERE donations.status = 'paid'::text
          GROUP BY donations.creator_id) d ON d.creator_id = bp.user_id;
