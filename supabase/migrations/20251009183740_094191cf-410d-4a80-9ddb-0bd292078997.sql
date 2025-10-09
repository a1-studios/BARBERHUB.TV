-- ============================================
-- PHASE 1: TOURNAMENT DATABASE FOUNDATION
-- ============================================

-- 1. CREATE TOURNAMENT TABLES
-- ============================================

-- tournaments: Season/competition info
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  qualification_end_date TIMESTAMPTZ NOT NULL,
  elimination_start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'qualification', 'elimination', 'completed', 'cancelled')),
  total_registered INTEGER DEFAULT 0,
  qualification_rounds INTEGER DEFAULT 5,
  min_participants INTEGER DEFAULT 16,
  youtube_stream_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- tournament_phases: Qualification, Round of 16, Quarterfinals, etc.
CREATE TABLE IF NOT EXISTS tournament_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_type TEXT NOT NULL CHECK (phase_type IN ('qualification', 'elimination')),
  phase_order INTEGER NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  matches_required INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- tournament_standings: Track barber performance
CREATE TABLE IF NOT EXISTS tournament_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  phase_id UUID REFERENCES tournament_phases(id),
  points INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  vote_difference INTEGER GENERATED ALWAYS AS (votes_for - votes_against) STORED,
  matches_played INTEGER DEFAULT 0,
  rank INTEGER,
  qualified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, barber_id, phase_id)
);

-- match_results: Record of each battle outcome
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE UNIQUE,
  tournament_id UUID REFERENCES tournaments(id),
  phase_id UUID REFERENCES tournament_phases(id),
  barber1_id UUID REFERENCES profiles(user_id),
  barber2_id UUID REFERENCES profiles(user_id),
  barber1_weighted_votes INTEGER DEFAULT 0,
  barber2_weighted_votes INTEGER DEFAULT 0,
  winner_id UUID REFERENCES profiles(user_id),
  is_draw BOOLEAN DEFAULT FALSE,
  barber1_points INTEGER DEFAULT 0,
  barber2_points INTEGER DEFAULT 0,
  match_type TEXT NOT NULL CHECK (match_type IN ('qualification', 'elimination')),
  round_number INTEGER,
  youtube_stream_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bracket_matches: Elimination bracket structure
CREATE TABLE IF NOT EXISTS bracket_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES tournament_phases(id) ON DELETE CASCADE,
  battle_id UUID REFERENCES battles(id),
  round_name TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  bracket_position INTEGER,
  seed1 INTEGER,
  seed2 INTEGER,
  barber1_id UUID REFERENCES profiles(user_id),
  barber2_id UUID REFERENCES profiles(user_id),
  winner_id UUID REFERENCES profiles(user_id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'live', 'voting', 'completed')),
  scheduled_at TIMESTAMPTZ,
  youtube_stream_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EXTEND EXISTING TABLES
-- ============================================

-- Add tournament context to battles
ALTER TABLE battles
ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id),
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES tournament_phases(id),
ADD COLUMN IF NOT EXISTS round_number INTEGER,
ADD COLUMN IF NOT EXISTS match_number INTEGER,
ADD COLUMN IF NOT EXISTS is_tournament_match BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS youtube_stream_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_vod_url TEXT;

-- Track tournament registration in battle_participants
ALTER TABLE battle_participants
ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id),
ADD COLUMN IF NOT EXISTS registration_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS seed INTEGER;

-- 3. DATABASE FUNCTIONS
-- ============================================

-- Function: Calculate match winner and points based on weighted voting
CREATE OR REPLACE FUNCTION calculate_match_result(battle_id_param UUID)
RETURNS TABLE(
  barber1_weighted_votes BIGINT,
  barber2_weighted_votes BIGINT,
  winner_id UUID,
  is_draw BOOLEAN,
  barber1_points INTEGER,
  barber2_points INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle RECORD;
  v_b1_votes BIGINT;
  v_b2_votes BIGINT;
  v_b1_submission_id UUID;
  v_b2_submission_id UUID;
BEGIN
  -- Get battle details
  SELECT * INTO v_battle FROM battles WHERE id = battle_id_param;
  
  IF v_battle IS NULL THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;
  
  -- Get submission IDs for each barber
  SELECT id INTO v_b1_submission_id 
  FROM battle_submissions 
  WHERE battle_id = battle_id_param AND user_id = v_battle.barber1_id 
  LIMIT 1;
  
  SELECT id INTO v_b2_submission_id 
  FROM battle_submissions 
  WHERE battle_id = battle_id_param AND user_id = v_battle.barber2_id 
  LIMIT 1;
  
  -- Get weighted votes using existing get_battle_vote_results function
  SELECT COALESCE(weighted_votes, 0) INTO v_b1_votes
  FROM get_battle_vote_results(battle_id_param)
  WHERE submission_id = v_b1_submission_id;
  
  SELECT COALESCE(weighted_votes, 0) INTO v_b2_votes
  FROM get_battle_vote_results(battle_id_param)
  WHERE submission_id = v_b2_submission_id;
  
  -- Default to 0 if no votes found
  v_b1_votes := COALESCE(v_b1_votes, 0);
  v_b2_votes := COALESCE(v_b2_votes, 0);
  
  -- Determine winner and points (3 for win, 1 for draw, 0 for loss)
  IF v_b1_votes > v_b2_votes THEN
    RETURN QUERY SELECT v_b1_votes, v_b2_votes, v_battle.barber1_id, FALSE, 3, 0;
  ELSIF v_b2_votes > v_b1_votes THEN
    RETURN QUERY SELECT v_b1_votes, v_b2_votes, v_battle.barber2_id, FALSE, 0, 3;
  ELSE
    RETURN QUERY SELECT v_b1_votes, v_b2_votes, NULL::UUID, TRUE, 1, 1;
  END IF;
END;
$$;

-- Function: Update tournament standings after a battle completes
CREATE OR REPLACE FUNCTION update_tournament_standings(battle_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
  v_battle RECORD;
  v_phase_type TEXT;
BEGIN
  -- Get battle info
  SELECT * INTO v_battle FROM battles WHERE id = battle_id_param;
  
  -- Skip if not a tournament battle
  IF v_battle.tournament_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get match result
  SELECT * INTO v_result FROM calculate_match_result(battle_id_param);
  
  -- Determine match type from phase
  SELECT phase_type INTO v_phase_type
  FROM tournament_phases
  WHERE id = v_battle.phase_id;
  
  -- Insert or update match_results
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
    v_result.barber1_weighted_votes::INTEGER, v_result.barber2_weighted_votes::INTEGER,
    CASE WHEN v_result.is_draw THEN NULL ELSE v_result.winner_id END,
    v_result.is_draw,
    v_result.barber1_points, v_result.barber2_points,
    COALESCE(v_phase_type, 'qualification'),
    v_battle.round_number, NOW()
  )
  ON CONFLICT (battle_id) DO UPDATE SET
    barber1_weighted_votes = EXCLUDED.barber1_weighted_votes,
    barber2_weighted_votes = EXCLUDED.barber2_weighted_votes,
    winner_id = EXCLUDED.winner_id,
    is_draw = EXCLUDED.is_draw,
    barber1_points = EXCLUDED.barber1_points,
    barber2_points = EXCLUDED.barber2_points,
    completed_at = EXCLUDED.completed_at;
  
  -- Update standings for barber 1
  INSERT INTO tournament_standings (
    tournament_id, barber_id, phase_id,
    points, wins, draws, losses,
    votes_for, votes_against, matches_played
  ) VALUES (
    v_battle.tournament_id, v_battle.barber1_id, v_battle.phase_id,
    v_result.barber1_points,
    CASE WHEN v_result.barber1_points = 3 THEN 1 ELSE 0 END,
    CASE WHEN v_result.is_draw THEN 1 ELSE 0 END,
    CASE WHEN v_result.barber1_points = 0 AND NOT v_result.is_draw THEN 1 ELSE 0 END,
    v_result.barber1_weighted_votes::INTEGER, 
    v_result.barber2_weighted_votes::INTEGER, 
    1
  )
  ON CONFLICT (tournament_id, barber_id, phase_id) DO UPDATE SET
    points = tournament_standings.points + EXCLUDED.points,
    wins = tournament_standings.wins + EXCLUDED.wins,
    draws = tournament_standings.draws + EXCLUDED.draws,
    losses = tournament_standings.losses + EXCLUDED.losses,
    votes_for = tournament_standings.votes_for + EXCLUDED.votes_for,
    votes_against = tournament_standings.votes_against + EXCLUDED.votes_against,
    matches_played = tournament_standings.matches_played + 1,
    updated_at = NOW();
  
  -- Update standings for barber 2
  INSERT INTO tournament_standings (
    tournament_id, barber_id, phase_id,
    points, wins, draws, losses,
    votes_for, votes_against, matches_played
  ) VALUES (
    v_battle.tournament_id, v_battle.barber2_id, v_battle.phase_id,
    v_result.barber2_points,
    CASE WHEN v_result.barber2_points = 3 THEN 1 ELSE 0 END,
    CASE WHEN v_result.is_draw THEN 1 ELSE 0 END,
    CASE WHEN v_result.barber2_points = 0 AND NOT v_result.is_draw THEN 1 ELSE 0 END,
    v_result.barber2_weighted_votes::INTEGER, 
    v_result.barber1_weighted_votes::INTEGER, 
    1
  )
  ON CONFLICT (tournament_id, barber_id, phase_id) DO UPDATE SET
    points = tournament_standings.points + EXCLUDED.points,
    wins = tournament_standings.wins + EXCLUDED.wins,
    draws = tournament_standings.draws + EXCLUDED.draws,
    losses = tournament_standings.losses + EXCLUDED.losses,
    votes_for = tournament_standings.votes_for + EXCLUDED.votes_for,
    votes_against = tournament_standings.votes_against + EXCLUDED.votes_against,
    matches_played = tournament_standings.matches_played + 1,
    updated_at = NOW();
    
  -- Recalculate rankings: Points → Vote Difference → Votes For
  WITH ranked AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY tournament_id, phase_id 
        ORDER BY points DESC, vote_difference DESC, votes_for DESC
      ) as new_rank
    FROM tournament_standings
    WHERE tournament_id = v_battle.tournament_id AND phase_id = v_battle.phase_id
  )
  UPDATE tournament_standings ts
  SET rank = ranked.new_rank, updated_at = NOW()
  FROM ranked
  WHERE ts.id = ranked.id;
END;
$$;

-- Function: Complete qualification phase and mark top N as qualified
CREATE OR REPLACE FUNCTION complete_qualification_phase(
  tournament_id_param UUID,
  phase_id_param UUID,
  top_n INTEGER DEFAULT 16
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark top N barbers as qualified
  WITH top_barbers AS (
    SELECT barber_id
    FROM tournament_standings
    WHERE tournament_id = tournament_id_param AND phase_id = phase_id_param
    ORDER BY rank ASC
    LIMIT top_n
  )
  UPDATE tournament_standings
  SET qualified = TRUE, updated_at = NOW()
  WHERE tournament_id = tournament_id_param 
    AND phase_id = phase_id_param
    AND barber_id IN (SELECT barber_id FROM top_barbers);
  
  -- Mark qualification phase as completed
  UPDATE tournament_phases
  SET status = 'completed', end_date = NOW()
  WHERE id = phase_id_param;
  
  -- Update tournament status
  UPDATE tournaments
  SET status = 'elimination', updated_at = NOW()
  WHERE id = tournament_id_param;
END;
$$;

-- Function: Generate elimination bracket from qualified barbers
CREATE OR REPLACE FUNCTION generate_elimination_bracket(
  tournament_id_param UUID,
  num_participants INTEGER DEFAULT 16
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase_id UUID;
  v_qualified_barbers UUID[];
  v_round_name TEXT;
  v_match_count INTEGER;
  i INTEGER;
  v_qual_phase_id UUID;
BEGIN
  -- Get the qualification phase ID
  SELECT id INTO v_qual_phase_id
  FROM tournament_phases
  WHERE tournament_id = tournament_id_param AND phase_type = 'qualification'
  ORDER BY phase_order ASC
  LIMIT 1;
  
  -- Get qualified barbers ordered by seed (rank)
  SELECT ARRAY_AGG(barber_id ORDER BY rank ASC)
  INTO v_qualified_barbers
  FROM tournament_standings
  WHERE tournament_id = tournament_id_param 
    AND phase_id = v_qual_phase_id
    AND qualified = TRUE
  LIMIT num_participants;
  
  -- Determine round name
  v_round_name := CASE num_participants
    WHEN 16 THEN 'Round of 16'
    WHEN 8 THEN 'Quarterfinals'
    WHEN 4 THEN 'Semifinals'
    WHEN 2 THEN 'Final'
    ELSE 'Elimination'
  END;
  
  -- Create elimination phase
  INSERT INTO tournament_phases (
    tournament_id, phase_name, phase_type, phase_order, status
  ) VALUES (
    tournament_id_param, 
    v_round_name,
    'elimination', 
    2, 
    'pending'
  ) RETURNING id INTO v_phase_id;
  
  -- Create bracket matches (seed 1 vs seed 16, seed 2 vs seed 15, etc.)
  v_match_count := num_participants / 2;
  FOR i IN 1..v_match_count LOOP
    INSERT INTO bracket_matches (
      tournament_id, phase_id,
      round_name, round_number, match_number,
      seed1, seed2,
      barber1_id, barber2_id,
      status, bracket_position
    ) VALUES (
      tournament_id_param, v_phase_id,
      v_round_name,
      1, i,
      i, num_participants - i + 1,
      v_qualified_barbers[i], v_qualified_barbers[num_participants - i + 1],
      'pending', i
    );
  END LOOP;
END;
$$;

-- 4. TRIGGER
-- ============================================

-- Trigger function: Auto-update standings when battle completes
CREATE OR REPLACE FUNCTION trigger_update_standings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.tournament_id IS NOT NULL THEN
    PERFORM update_tournament_standings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS after_battle_completed ON battles;
CREATE TRIGGER after_battle_completed
AFTER UPDATE ON battles
FOR EACH ROW
EXECUTE FUNCTION trigger_update_standings();

-- 5. RLS POLICIES
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_matches ENABLE ROW LEVEL SECURITY;

-- Everyone can view tournaments
CREATE POLICY "tournaments_select" ON tournaments 
FOR SELECT USING (true);

-- Everyone can view tournament phases
CREATE POLICY "phases_select" ON tournament_phases 
FOR SELECT USING (true);

-- Everyone can view standings
CREATE POLICY "standings_select" ON tournament_standings 
FOR SELECT USING (true);

-- Everyone can view match results
CREATE POLICY "match_results_select" ON match_results 
FOR SELECT USING (true);

-- Everyone can view brackets
CREATE POLICY "bracket_matches_select" ON bracket_matches 
FOR SELECT USING (true);

-- System/admin can manage tournaments (users cannot modify)
CREATE POLICY "tournaments_system" ON tournaments 
FOR ALL USING (false);

-- System can insert/update standings
CREATE POLICY "standings_system_insert" ON tournament_standings 
FOR INSERT WITH CHECK (false);

CREATE POLICY "standings_system_update" ON tournament_standings 
FOR UPDATE USING (false);

-- System can manage match results
CREATE POLICY "match_results_system" ON match_results 
FOR ALL USING (false);

-- System can manage brackets
CREATE POLICY "bracket_matches_system" ON bracket_matches 
FOR ALL USING (false);

-- System can manage phases
CREATE POLICY "phases_system" ON tournament_phases 
FOR ALL USING (false);

-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tournament_standings_tournament ON tournament_standings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_standings_barber ON tournament_standings(barber_id);
CREATE INDEX IF NOT EXISTS idx_tournament_standings_rank ON tournament_standings(tournament_id, phase_id, rank);
CREATE INDEX IF NOT EXISTS idx_match_results_battle ON match_results(battle_id);
CREATE INDEX IF NOT EXISTS idx_match_results_tournament ON match_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_tournament ON bracket_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_battles_tournament ON battles(tournament_id) WHERE tournament_id IS NOT NULL;