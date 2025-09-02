
-- 1) Enforce one vote per user per battle
CREATE UNIQUE INDEX IF NOT EXISTS battle_votes_unique_user_per_battle
ON public.battle_votes (battle_id, voter_id);

-- 2) Allow users to update their own vote (to change submission)
DROP POLICY IF EXISTS "Users can update their own vote" ON public.battle_votes;
CREATE POLICY "Users can update their own vote"
  ON public.battle_votes
  FOR UPDATE
  USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id);

-- 3) Validate voting time window (battle must be 'voting' and not past voting_ends_at)
CREATE OR REPLACE FUNCTION public.validate_vote_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_voting_ends_at timestamptz;
BEGIN
  SELECT status, voting_ends_at
    INTO v_status, v_voting_ends_at
  FROM public.battles
  WHERE id = NEW.battle_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  IF v_status <> 'voting' THEN
    RAISE EXCEPTION 'Voting is not allowed at this time (status: %)', v_status;
  END IF;

  IF v_voting_ends_at IS NOT NULL AND now() > v_voting_ends_at THEN
    RAISE EXCEPTION 'Voting period has ended';
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Ensure the vote references a submission that belongs to the same battle
-- (Function public.validate_vote_submission() already exists. Attach triggers.)
DROP TRIGGER IF EXISTS trg_validate_vote_submission ON public.battle_votes;
CREATE TRIGGER trg_validate_vote_submission
BEFORE INSERT OR UPDATE ON public.battle_votes
FOR EACH ROW
EXECUTE FUNCTION public.validate_vote_submission();

-- 5) Attach the voting time window trigger
DROP TRIGGER IF EXISTS trg_validate_vote_time ON public.battle_votes;
CREATE TRIGGER trg_validate_vote_time
BEFORE INSERT OR UPDATE ON public.battle_votes
FOR EACH ROW
EXECUTE FUNCTION public.validate_vote_time();

-- 6) Weighted vote aggregation function (barber=3x, fan=1x by default)
-- Note: You can pass different weights when calling via RPC if needed.
CREATE OR REPLACE FUNCTION public.get_battle_vote_results(
  _battle_id uuid,
  _barber_weight integer DEFAULT 3,
  _fan_weight integer DEFAULT 1
)
RETURNS TABLE (
  submission_id uuid,
  weighted_votes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT v.submission_id,
         SUM(
           CASE COALESCE(p.user_type, 'fan')
             WHEN 'barber' THEN _barber_weight
             ELSE _fan_weight
           END
         )::bigint AS weighted_votes
  FROM public.battle_votes v
  LEFT JOIN public.profiles p
    ON p.user_id = v.voter_id
  WHERE v.battle_id = _battle_id
  GROUP BY v.submission_id
  ORDER BY weighted_votes DESC;
END;
$$;
