-- Platform state keys for Quick Play
INSERT INTO public.platform_state (key, value)
VALUES
  ('quick_play_enabled', 'true'),
  ('quick_play_feed_publish', 'false')
ON CONFLICT (key) DO NOTHING;

-- Tag rows so tournament infra can ignore Quick Play matches
ALTER TABLE public.open_challenges
  ADD COLUMN IF NOT EXISTS match_mode text NOT NULL DEFAULT 'quick_play';

ALTER TABLE public.battles
  ADD COLUMN IF NOT EXISTS match_mode text NOT NULL DEFAULT 'tournament';

CREATE INDEX IF NOT EXISTS idx_battles_match_mode ON public.battles(match_mode);
CREATE INDEX IF NOT EXISTS idx_open_challenges_match_mode ON public.open_challenges(match_mode);