
-- ============================================
-- Pioneer Mutual Reputation System Tables
-- ============================================

-- Reviews table
CREATE TABLE public.appointment_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  star_rating INTEGER NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  comment TEXT,
  is_internal_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, reviewer_id)
);

-- Review tags
CREATE TABLE public.review_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.appointment_reviews(id) ON DELETE CASCADE,
  tag_slug TEXT NOT NULL,
  is_negative BOOLEAN NOT NULL DEFAULT false,
  is_internal_only BOOLEAN NOT NULL DEFAULT false
);

-- Reputation scores (Anti-Gravity computed cache)
CREATE TABLE public.reputation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  avg_star_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  top_tags JSONB DEFAULT '[]',
  internal_top_tags JSONB DEFAULT '[]',
  risk_flags JSONB DEFAULT '{}',
  last_computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.appointment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_scores ENABLE ROW LEVEL SECURITY;

-- appointment_reviews: authenticated can read public reviews
CREATE POLICY "Authenticated can read public reviews"
  ON public.appointment_reviews FOR SELECT TO authenticated
  USING (is_internal_only = false OR public.has_role(auth.uid(), 'barber'));

-- appointment_reviews: users can insert their own reviews
CREATE POLICY "Users can insert own reviews"
  ON public.appointment_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- review_tags: same visibility as reviews
CREATE POLICY "Authenticated can read public tags"
  ON public.review_tags FOR SELECT TO authenticated
  USING (
    is_internal_only = false 
    OR public.has_role(auth.uid(), 'barber')
  );

CREATE POLICY "Users can insert tags for own reviews"
  ON public.review_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointment_reviews
      WHERE id = review_id AND reviewer_id = auth.uid()
    )
  );

-- reputation_scores: readable by all authenticated
CREATE POLICY "Authenticated can read reputation scores"
  ON public.reputation_scores FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- Security Definer Function for Barber-Only Fields
-- ============================================

CREATE OR REPLACE FUNCTION public.get_client_reputation(target_user_id UUID)
RETURNS TABLE(
  avg_star_rating NUMERIC(3,2),
  total_reviews INTEGER,
  top_tags JSONB,
  internal_top_tags JSONB,
  risk_flags JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'barber') THEN
    RETURN QUERY
      SELECT rs.avg_star_rating, rs.total_reviews, rs.top_tags, '[]'::JSONB, '{}'::JSONB
      FROM reputation_scores rs WHERE rs.user_id = target_user_id;
  ELSE
    RETURN QUERY
      SELECT rs.avg_star_rating, rs.total_reviews, rs.top_tags, rs.internal_top_tags, rs.risk_flags
      FROM reputation_scores rs WHERE rs.user_id = target_user_id;
  END IF;
END;
$$;

-- ============================================
-- Anti-Gravity Trigger: Review Prompt on Completion
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_review_prompt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM create_battle_notification(
      NEW.client_id, 'review_prompt',
      'How was your cut? ✂️', 'Rate your barber!',
      jsonb_build_object('appointment_id', NEW.id, 'reviewee_id', NEW.barber_user_id)
    );
    PERFORM create_battle_notification(
      NEW.barber_user_id, 'review_prompt',
      'Rate your client', 'Leave internal feedback',
      jsonb_build_object('appointment_id', NEW.id, 'reviewee_id', NEW.client_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_prompt
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_review_prompt();

-- ============================================
-- Anti-Gravity Trigger: Recompute Reputation
-- ============================================

CREATE OR REPLACE FUNCTION public.recompute_reputation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO reputation_scores (user_id, avg_star_rating, total_reviews, top_tags, internal_top_tags, risk_flags, last_computed_at)
  SELECT
    NEW.reviewee_id,
    (SELECT AVG(star_rating)::NUMERIC(3,2) FROM appointment_reviews WHERE reviewee_id = NEW.reviewee_id),
    (SELECT COUNT(*)::INTEGER FROM appointment_reviews WHERE reviewee_id = NEW.reviewee_id),
    (SELECT COALESCE(jsonb_agg(t), '[]') FROM (
      SELECT tag_slug as slug, count(*) as count, is_negative
      FROM review_tags rt JOIN appointment_reviews ar ON ar.id = rt.review_id
      WHERE ar.reviewee_id = NEW.reviewee_id AND rt.is_internal_only = false
      GROUP BY tag_slug, is_negative ORDER BY count DESC LIMIT 5
    ) t),
    (SELECT COALESCE(jsonb_agg(t), '[]') FROM (
      SELECT tag_slug as slug, count(*) as count, is_negative
      FROM review_tags rt JOIN appointment_reviews ar ON ar.id = rt.review_id
      WHERE ar.reviewee_id = NEW.reviewee_id AND rt.is_internal_only = true
      GROUP BY tag_slug, is_negative ORDER BY count DESC LIMIT 5
    ) t),
    (SELECT COALESCE(jsonb_object_agg(tag_slug, cnt), '{}') FROM (
      SELECT tag_slug, count(*) as cnt
      FROM review_tags rt JOIN appointment_reviews ar ON ar.id = rt.review_id
      WHERE ar.reviewee_id = NEW.reviewee_id AND rt.is_internal_only = true AND rt.is_negative = true
      GROUP BY tag_slug
    ) rf),
    NOW()
  ON CONFLICT (user_id) DO UPDATE SET
    avg_star_rating = EXCLUDED.avg_star_rating,
    total_reviews = EXCLUDED.total_reviews,
    top_tags = EXCLUDED.top_tags,
    internal_top_tags = EXCLUDED.internal_top_tags,
    risk_flags = EXCLUDED.risk_flags,
    last_computed_at = NOW();

  -- Also sync to barber_profiles.rating if reviewee is a barber
  UPDATE barber_profiles
  SET rating = (SELECT AVG(star_rating)::NUMERIC(3,2) FROM appointment_reviews WHERE reviewee_id = NEW.reviewee_id)
  WHERE user_id = NEW.reviewee_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recompute_reputation
  AFTER INSERT ON public.appointment_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_reputation();
