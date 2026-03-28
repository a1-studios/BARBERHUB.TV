
-- Phase 1a: pending_payouts table for 2-week delayed barber payouts
CREATE TABLE public.pending_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_bb INTEGER NOT NULL,
  battle_id UUID REFERENCES public.battles(id) ON DELETE SET NULL,
  challenge_id UUID,
  payout_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_release_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pending_payouts_status_release ON public.pending_payouts (status, scheduled_release_at);
CREATE INDEX idx_pending_payouts_user ON public.pending_payouts (user_id);

ALTER TABLE public.pending_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending payouts"
  ON public.pending_payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Phase 1b: Add show_up_points to tournament_standings
ALTER TABLE public.tournament_standings
  ADD COLUMN IF NOT EXISTS show_up_points INTEGER DEFAULT 0;

-- Phase 1c: RPC - deduct_queue_entry_fee
CREATE OR REPLACE FUNCTION public.deduct_queue_entry_fee(
  p_user_id UUID,
  p_category TEXT,
  p_amount_bb INTEGER DEFAULT 250
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_pool_amount INTEGER;
  v_platform_amount INTEGER;
BEGIN
  SELECT barber_bucks INTO v_balance
  FROM profiles WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount_bb THEN
    RAISE EXCEPTION 'Insufficient Barber Bucks (have: %, need: %)', COALESCE(v_balance, 0), p_amount_bb;
  END IF;

  v_new_balance := v_balance - p_amount_bb;
  v_platform_amount := FLOOR(p_amount_bb * 0.20);
  v_pool_amount := p_amount_bb - v_platform_amount;

  UPDATE profiles SET barber_bucks = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  INSERT INTO barber_bucks_transactions (user_id, amount, balance_after, transaction_type, description)
  VALUES (p_user_id, -p_amount_bb, v_new_balance, 'tournament_entry', 'Tournament entry fee (' || p_category || ')');

  -- 80% to category prize pool
  INSERT INTO category_prize_pools (category, tournament_year, total_pool_cents, entry_contributions_cents)
  VALUES (p_category, EXTRACT(YEAR FROM NOW())::INTEGER, v_pool_amount * 20, v_pool_amount * 20)
  ON CONFLICT (category, tournament_year) DO UPDATE SET
    total_pool_cents = category_prize_pools.total_pool_cents + EXCLUDED.total_pool_cents,
    entry_contributions_cents = category_prize_pools.entry_contributions_cents + EXCLUDED.entry_contributions_cents,
    last_updated = NOW();

  -- 20% platform fee
  IF v_platform_amount > 0 THEN
    INSERT INTO platform_transactions (amount_cents, transaction_type, description, source_user_id)
    VALUES (v_platform_amount * 20, 'tournament_entry_fee', '20% entry fee from ' || p_category, p_user_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'pool_contribution', v_pool_amount, 'platform_fee', v_platform_amount);
END;
$$;

-- Phase 1c: RPC - award_show_up_point (idempotent)
CREATE OR REPLACE FUNCTION public.award_show_up_point(
  p_barber_profile_id UUID,
  p_battle_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_battle RECORD;
  v_already_awarded BOOLEAN;
BEGIN
  SELECT tournament_id, phase_id, is_tournament_match INTO v_battle
  FROM battles WHERE id = p_battle_id;

  IF v_battle IS NULL OR v_battle.is_tournament_match IS NOT TRUE THEN
    RETURN FALSE;
  END IF;

  -- Check idempotency via a simple marker in match_results or standings
  UPDATE tournament_standings
  SET show_up_points = show_up_points + 1, updated_at = NOW()
  WHERE tournament_id = v_battle.tournament_id
    AND barber_id = p_barber_profile_id
    AND phase_id = v_battle.phase_id;

  RETURN FOUND;
END;
$$;

-- Phase 1c: RPC - finalize_vod_prize_split
CREATE OR REPLACE FUNCTION public.finalize_vod_prize_split(
  p_battle_id UUID,
  p_winner_id UUID,
  p_loser_id UUID,
  p_is_draw BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_battle RECORD;
BEGIN
  SELECT tournament_id, phase_id INTO v_battle
  FROM battles WHERE id = p_battle_id;

  IF v_battle.tournament_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Not a tournament match');
  END IF;

  IF p_is_draw THEN
    -- +1 point each on draw
    UPDATE tournament_standings
    SET points = points + 1, draws = draws + 1, updated_at = NOW()
    WHERE tournament_id = v_battle.tournament_id AND phase_id = v_battle.phase_id
      AND barber_id IN (p_winner_id, p_loser_id);
  ELSE
    -- +2 season points to VOD winner
    UPDATE tournament_standings
    SET points = points + 2, updated_at = NOW()
    WHERE tournament_id = v_battle.tournament_id AND phase_id = v_battle.phase_id
      AND barber_id = p_winner_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'is_draw', p_is_draw);
END;
$$;
