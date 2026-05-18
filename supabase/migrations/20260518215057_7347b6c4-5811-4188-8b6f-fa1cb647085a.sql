
ALTER TABLE public.creations
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS captions_vtt TEXT;

ALTER TABLE public.creator_content
  ADD COLUMN IF NOT EXISTS captions_vtt TEXT;

ALTER TABLE public.battle_submissions
  ADD COLUMN IF NOT EXISTS captions_vtt TEXT;

CREATE INDEX IF NOT EXISTS creations_published_idx ON public.creations (is_published, created_at DESC);
