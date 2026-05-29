-- Welcome bonus state on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_bonus_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (welcome_bonus_state IN ('pending', 'claimed', 'forfeited'));

-- Backfill: any existing profile is treated as 'forfeited' so we don't retro-credit
UPDATE public.profiles SET welcome_bonus_state = 'forfeited'
WHERE welcome_bonus_state = 'pending' AND created_at < now() - interval '1 minute';

-- Claim function: credits 15 BB once when profile is complete (role + country)
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_state text;
  v_user_type text;
  v_country text;
  v_balance int;
  v_bonus int := 15;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT welcome_bonus_state, user_type, country_code, COALESCE(barber_bucks, 0)
    INTO v_state, v_user_type, v_country, v_balance
  FROM public.profiles
  WHERE user_id = v_user
  FOR UPDATE;

  IF v_state IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_profile');
  END IF;

  IF v_state = 'claimed' THEN
    RETURN jsonb_build_object('ok', true, 'already_claimed', true, 'amount', 0);
  END IF;

  IF v_state = 'forfeited' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forfeited');
  END IF;

  IF v_user_type IS NULL OR v_country IS NULL OR v_country = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_incomplete');
  END IF;

  UPDATE public.profiles
     SET barber_bucks = v_balance + v_bonus,
         welcome_bonus_state = 'claimed'
   WHERE user_id = v_user;

  INSERT INTO public.barber_bucks_transactions
    (user_id, amount, transaction_type, description, balance_after)
  VALUES
    (v_user, v_bonus, 'bonus', 'Welcome bonus — profile completed', v_balance + v_bonus);

  RETURN jsonb_build_object('ok', true, 'amount', v_bonus, 'new_balance', v_balance + v_bonus);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus() TO authenticated;