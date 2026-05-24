CREATE OR REPLACE FUNCTION public.get_landing_teasers()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH chosen AS (
    SELECT b.*
    FROM battles b
    WHERE b.status IN ('live','active','upcoming')
      AND b.barber1_id IS NOT NULL
      AND b.barber2_id IS NOT NULL
    ORDER BY
      CASE b.status WHEN 'live' THEN 3 WHEN 'active' THEN 2 ELSE 1 END DESC,
      (COALESCE(b.barber1_is_streaming,false) OR COALESCE(b.barber2_is_streaming,false)) DESC,
      b.created_at DESC
    LIMIT 1
  ),
  battle_barbers AS (
    SELECT
      c.id, c.title,
      COALESCE(c.barber1_live_viewers,0) + COALESCE(c.barber2_live_viewers,0) + COALESCE(c.live_viewers,0) AS viewers,
      bp1.user_id AS u1, bp1.is_live AS l1,
      bp2.user_id AS u2, bp2.is_live AS l2
    FROM chosen c
    LEFT JOIN barber_profiles bp1 ON bp1.id = c.barber1_id
    LEFT JOIN barber_profiles bp2 ON bp2.id = c.barber2_id
  ),
  live_battle_json AS (
    SELECT jsonb_build_object(
      'id', bb.id,
      'title', bb.title,
      'viewers', bb.viewers,
      'barber1', (
        SELECT jsonb_build_object(
          'user_id', p.user_id, 'display_name', p.display_name,
          'avatar_url', p.avatar_url, 'country_code', p.country_code,
          'is_live', COALESCE(bb.l1,false)
        )
        FROM public_user_profiles p WHERE p.user_id = bb.u1
      ),
      'barber2', (
        SELECT jsonb_build_object(
          'user_id', p.user_id, 'display_name', p.display_name,
          'avatar_url', p.avatar_url, 'country_code', p.country_code,
          'is_live', COALESCE(bb.l2,false)
        )
        FROM public_user_profiles p WHERE p.user_id = bb.u2
      )
    ) AS j
    FROM battle_barbers bb
  ),
  clips AS (
    SELECT
      bs.id, bs.title,
      COALESCE(bs.thumbnail_url, bs.stream_thumbnail_url) AS thumbnail_url,
      bs.cloudflare_stream_uid,
      p.display_name AS author
    FROM battle_submissions bs
    LEFT JOIN public_user_profiles p ON p.user_id = bs.user_id
    WHERE bs.thumbnail_url IS NOT NULL
       OR bs.stream_thumbnail_url IS NOT NULL
       OR bs.cloudflare_stream_uid IS NOT NULL
    ORDER BY bs.created_at DESC
    LIMIT 8
  )
  SELECT jsonb_build_object(
    'live_battle', (SELECT j FROM live_battle_json),
    'featured_clips', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title,
        'thumbnail_url', c.thumbnail_url,
        'cloudflare_stream_uid', c.cloudflare_stream_uid,
        'author', c.author
      )) FROM clips c),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_teasers() TO anon, authenticated;