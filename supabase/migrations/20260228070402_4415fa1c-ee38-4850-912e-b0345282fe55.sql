
-- Sponsor ad click tracking table
CREATE TABLE public.sponsor_ad_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_ad_id UUID NOT NULL REFERENCES public.sponsor_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  click_type TEXT NOT NULL DEFAULT 'click',
  slide_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast aggregation queries
CREATE INDEX idx_sponsor_ad_clicks_sponsor ON public.sponsor_ad_clicks(sponsor_ad_id);
CREATE INDEX idx_sponsor_ad_clicks_created ON public.sponsor_ad_clicks(created_at);

ALTER TABLE public.sponsor_ad_clicks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own clicks
CREATE POLICY "Users can insert own clicks"
  ON public.sponsor_ad_clicks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Anon impressions (user_id must be null)
CREATE POLICY "Anon can insert clicks"
  ON public.sponsor_ad_clicks FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Sovereign can read all clicks
CREATE POLICY "Sovereign can read all clicks"
  ON public.sponsor_ad_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'sovereign'));
