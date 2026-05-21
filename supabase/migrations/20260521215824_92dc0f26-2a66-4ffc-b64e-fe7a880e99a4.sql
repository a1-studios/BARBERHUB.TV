
-- Add stream readiness columns to all three media tables
ALTER TABLE public.creations
  ADD COLUMN IF NOT EXISTS stream_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stream_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS stream_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS stream_duration_seconds numeric;

ALTER TABLE public.creator_content
  ADD COLUMN IF NOT EXISTS stream_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stream_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS stream_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS stream_duration_seconds numeric;

ALTER TABLE public.battle_submissions
  ADD COLUMN IF NOT EXISTS stream_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stream_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS stream_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS stream_duration_seconds numeric;

-- Indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_creations_stream_status_created
  ON public.creations(stream_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_content_stream_status_created
  ON public.creator_content(stream_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battle_submissions_stream_status_created
  ON public.battle_submissions(stream_status, created_at DESC);

-- Backfill: anything that already has a stream uid OR has no uid at all (legacy mp4/image) is considered "ready" for display
UPDATE public.creations
  SET stream_status = 'ready', stream_ready_at = COALESCE(stream_ready_at, created_at)
  WHERE stream_status = 'pending';

UPDATE public.creator_content
  SET stream_status = 'ready', stream_ready_at = COALESCE(stream_ready_at, created_at)
  WHERE stream_status = 'pending';

UPDATE public.battle_submissions
  SET stream_status = 'ready', stream_ready_at = COALESCE(stream_ready_at, created_at)
  WHERE stream_status = 'pending';
