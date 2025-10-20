-- Phase 1: Database Schema Updates for Video Submission System

-- 1. Add new status comment to document the battle lifecycle
COMMENT ON COLUMN battles.status IS 'Battle lifecycle: upcoming → awaiting_submissions → voting → completed';

-- 2. Add helper columns for quick video URL reference
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS barber_1_video_url TEXT,
ADD COLUMN IF NOT EXISTS barber_2_video_url TEXT,
ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES profiles(user_id);

-- 3. Create indexes for faster queries on voting battles
CREATE INDEX IF NOT EXISTS idx_battles_status_voting 
ON battles(status) WHERE status = 'voting';

CREATE INDEX IF NOT EXISTS idx_battles_barber_participants 
ON battles(barber1_id, barber2_id);

-- 4. Create index for battles awaiting submissions
CREATE INDEX IF NOT EXISTS idx_battles_status_awaiting 
ON battles(status) WHERE status = 'awaiting_submissions';

-- 5. Update existing battles that are ready for submissions
-- (Battles that have both barbers assigned and are in upcoming status)
UPDATE battles 
SET status = 'awaiting_submissions' 
WHERE status = 'upcoming' 
  AND barber1_id IS NOT NULL 
  AND barber2_id IS NOT NULL
  AND starts_at <= NOW();

-- 6. Add function to increment vote counts atomically (for weighted voting)
CREATE OR REPLACE FUNCTION increment_vote_count(
  submission_id UUID,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  UPDATE battle_submissions
  SET votes_count = COALESCE(votes_count, 0) + increment_by
  WHERE id = submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Add function to increment no-show count for barbers who don't submit videos
CREATE OR REPLACE FUNCTION increment_no_show_count(
  barber_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE barber_profiles
  SET no_show_count = COALESCE(no_show_count, 0) + 1
  WHERE user_id = barber_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;