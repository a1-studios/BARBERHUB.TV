-- Add new columns to battles table for forfeit tracking
ALTER TABLE battles ADD COLUMN IF NOT EXISTS submission_deadline TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS forfeit_reason TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS forfeit_winner_id UUID REFERENCES profiles(user_id);

-- Create index for performance on deadline checks
CREATE INDEX IF NOT EXISTS idx_battles_submission_deadline 
ON battles(submission_deadline, status) 
WHERE status IN ('upcoming', 'active', 'awaiting_submissions');

-- Create function to handle forfeit match results
CREATE OR REPLACE FUNCTION create_forfeit_match_result(
  battle_id_param UUID,
  winner_id_param UUID,
  forfeit_reason_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_battle RECORD;
  v_b1_points INTEGER;
  v_b2_points INTEGER;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = battle_id_param;
  
  IF v_battle IS NULL THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;
  
  -- Determine points based on who won/lost
  IF winner_id_param = v_battle.barber1_id THEN
    v_b1_points := 3;
    v_b2_points := 0;
  ELSIF winner_id_param = v_battle.barber2_id THEN
    v_b1_points := 0;
    v_b2_points := 3;
  ELSE
    -- Both forfeited
    v_b1_points := 0;
    v_b2_points := 0;
  END IF;
  
  -- Insert match result
  INSERT INTO match_results (
    battle_id, tournament_id, phase_id,
    barber1_id, barber2_id,
    barber1_weighted_votes, barber2_weighted_votes,
    winner_id, is_draw,
    barber1_points, barber2_points,
    match_type, round_number, completed_at
  ) VALUES (
    battle_id_param, v_battle.tournament_id, v_battle.phase_id,
    v_battle.barber1_id, v_battle.barber2_id,
    0, 0, -- No votes, it was a forfeit
    CASE WHEN v_b1_points = 0 AND v_b2_points = 0 THEN NULL ELSE winner_id_param END,
    FALSE, -- Not a draw, it's a forfeit
    v_b1_points, v_b2_points,
    'forfeit', v_battle.round_number, NOW()
  )
  ON CONFLICT (battle_id) DO UPDATE SET
    winner_id = EXCLUDED.winner_id,
    barber1_points = EXCLUDED.barber1_points,
    barber2_points = EXCLUDED.barber2_points,
    match_type = EXCLUDED.match_type,
    completed_at = EXCLUDED.completed_at;
END;
$$;