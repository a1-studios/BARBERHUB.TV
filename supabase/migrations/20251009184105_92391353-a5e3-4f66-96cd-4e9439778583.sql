-- ============================================
-- PHASE 2: YouTube Integration - Battle Submissions
-- ============================================

-- Add YouTube streaming fields to battle_submissions
ALTER TABLE battle_submissions
ADD COLUMN IF NOT EXISTS youtube_vod_url TEXT,
ADD COLUMN IF NOT EXISTS is_live_stream BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stream_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stream_ended_at TIMESTAMPTZ;