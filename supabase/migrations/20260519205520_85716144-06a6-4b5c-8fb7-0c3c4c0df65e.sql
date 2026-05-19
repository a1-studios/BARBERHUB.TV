
-- 1) music_tracks
CREATE TABLE public.music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  license TEXT NOT NULL DEFAULT 'royalty_free',
  genre TEXT,
  mood TEXT,
  bpm INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Music tracks readable when active" ON public.music_tracks
  FOR SELECT USING (is_active = true OR public.is_sovereign());
CREATE POLICY "Sovereigns manage music tracks" ON public.music_tracks
  FOR ALL USING (public.is_sovereign()) WITH CHECK (public.is_sovereign());
CREATE TRIGGER music_tracks_updated_at BEFORE UPDATE ON public.music_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_timestamp();

-- 2) dmca_certifications
CREATE TABLE public.dmca_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID,
  content_url TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  certified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dmca_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own certifications" ON public.dmca_certifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own certifications" ON public.dmca_certifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_sovereign());

-- 3) moderation_strikes
CREATE TABLE public.moderation_strikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_id UUID,
  content_type TEXT,
  report_id UUID,
  reason TEXT NOT NULL,
  issued_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_strikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sovereigns manage strikes" ON public.moderation_strikes
  FOR ALL USING (public.is_sovereign()) WITH CHECK (public.is_sovereign());
CREATE POLICY "Users view own strikes" ON public.moderation_strikes
  FOR SELECT USING (auth.uid() = user_id);

-- 4) moderation_actions audit log
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  target_user_id UUID,
  target_content_id UUID,
  target_content_type TEXT,
  action_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sovereigns manage actions" ON public.moderation_actions
  FOR ALL USING (public.is_sovereign()) WITH CHECK (public.is_sovereign());

-- 5) profiles ban columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT;

-- 6) content_reports workflow columns
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID,
  ADD COLUMN IF NOT EXISTS resolution_action TEXT;

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_strikes_user ON public.moderation_strikes(user_id);
