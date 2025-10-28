-- Ensure battles table has all necessary columns for elite battle system
-- Add missing columns if they don't exist

-- Add submission_deadline if it doesn't exist (different from voting_ends_at)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'battles' AND column_name = 'submission_deadline') THEN
    ALTER TABLE battles ADD COLUMN submission_deadline TIMESTAMPTZ;
  END IF;
END $$;

-- Update status to include 'awaiting_submissions' if not already present
-- This is the state when battle is matched but videos aren't submitted yet
COMMENT ON COLUMN battles.status IS 'Status values: upcoming, awaiting_submissions, voting, active, completed, cancelled';

-- Add indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_battles_barber1_status ON battles(barber1_id, status);
CREATE INDEX IF NOT EXISTS idx_battles_barber2_status ON battles(barber2_id, status);
CREATE INDEX IF NOT EXISTS idx_battles_status_starts_at ON battles(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_battles_voting_ends_at ON battles(voting_ends_at) WHERE status = 'voting';

-- Create a function to automatically transition battle status when both videos are submitted
CREATE OR REPLACE FUNCTION check_battle_submissions_and_activate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle_status TEXT;
  v_barber1_video TEXT;
  v_barber2_video TEXT;
  v_submission_count INTEGER;
BEGIN
  -- Get battle details
  SELECT status, barber_1_video_url, barber_2_video_url
  INTO v_battle_status, v_barber1_video, v_barber2_video
  FROM battles
  WHERE id = NEW.battle_id;
  
  -- Count submissions for this battle
  SELECT COUNT(*)
  INTO v_submission_count
  FROM battle_submissions
  WHERE battle_id = NEW.battle_id 
    AND youtube_vod_url IS NOT NULL;
  
  -- If both barbers have submitted and battle is awaiting submissions, transition to voting
  IF v_submission_count >= 2 AND v_battle_status IN ('awaiting_submissions', 'active') THEN
    UPDATE battles
    SET 
      status = 'voting',
      voting_ends_at = COALESCE(voting_ends_at, NOW() + INTERVAL '7 days')
    WHERE id = NEW.battle_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic battle activation
DROP TRIGGER IF EXISTS trigger_check_battle_submissions ON battle_submissions;
CREATE TRIGGER trigger_check_battle_submissions
  AFTER INSERT OR UPDATE OF youtube_vod_url
  ON battle_submissions
  FOR EACH ROW
  WHEN (NEW.youtube_vod_url IS NOT NULL)
  EXECUTE FUNCTION check_battle_submissions_and_activate();