
-- Add columns to creator_content table
ALTER TABLE public.creator_content 
  ADD COLUMN IF NOT EXISTS promote_to_feed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_category TEXT DEFAULT 'tip',
  ADD COLUMN IF NOT EXISTS boost_amount_bb INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Create feed_content_type enum
DO $$ BEGIN
  CREATE TYPE public.feed_content_type AS ENUM ('battle', 'course_teaser', 'sponsor_ad', 'update');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create feed_items table
CREATE TABLE IF NOT EXISTS public.feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type feed_content_type NOT NULL DEFAULT 'update',
  source_table TEXT,
  creator_id UUID REFERENCES public.profiles(user_id),
  is_locked BOOLEAN DEFAULT false,
  rank_score FLOAT DEFAULT 0,
  promote_boost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for feed_items
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feed items"
  ON public.feed_items FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Creators can insert own feed items"
  ON public.feed_items FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update own feed items"
  ON public.feed_items FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid());

-- build_universal_feed function
CREATE OR REPLACE FUNCTION public.build_universal_feed(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  item_id UUID,
  content_type TEXT,
  content_id UUID,
  creator_id UUID,
  title TEXT,
  description TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  creator_name TEXT,
  creator_avatar TEXT,
  rank_score FLOAT,
  is_locked BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Battles (highest priority)
  SELECT
    bs.id AS item_id,
    'battle'::TEXT AS content_type,
    bs.battle_id AS content_id,
    bs.user_id AS creator_id,
    COALESCE(bs.title, b.title) AS title,
    bs.description,
    bs.media_url,
    bs.thumbnail_url,
    p.display_name AS creator_name,
    p.avatar_url AS creator_avatar,
    1000.0::FLOAT AS rank_score,
    false AS is_locked,
    bs.created_at
  FROM battle_submissions bs
  JOIN battles b ON b.id = bs.battle_id
  LEFT JOIN profiles p ON p.user_id = bs.user_id
  WHERE bs.media_url IS NOT NULL

  UNION ALL

  -- Educator content (promoted to feed)
  SELECT
    cc.id AS item_id,
    'course_teaser'::TEXT AS content_type,
    cc.id AS content_id,
    cc.creator_id,
    cc.title,
    cc.description,
    cc.media_url,
    cc.thumbnail_url,
    p.display_name AS creator_name,
    p.avatar_url AS creator_avatar,
    (500.0 + COALESCE(cc.boost_amount_bb, 0)::FLOAT)::FLOAT AS rank_score,
    false AS is_locked,
    cc.created_at
  FROM creator_content cc
  LEFT JOIN profiles p ON p.user_id = cc.creator_id
  WHERE cc.promote_to_feed = true AND cc.is_published = true

  UNION ALL

  -- Sponsor ads
  SELECT
    sa.id AS item_id,
    'sponsor_ad'::TEXT AS content_type,
    sa.id AS content_id,
    sa.sponsor_id AS creator_id,
    sa.name AS title,
    sa.message AS description,
    sa.logo_url AS media_url,
    NULL::TEXT AS thumbnail_url,
    sa.name AS creator_name,
    sa.logo_url AS creator_avatar,
    100.0::FLOAT AS rank_score,
    false AS is_locked,
    sa.created_at
  FROM sponsor_ads sa
  WHERE sa.is_active = true

  ORDER BY rank_score DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
