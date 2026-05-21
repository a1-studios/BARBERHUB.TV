CREATE OR REPLACE FUNCTION public.award_signup_bonus(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _already boolean;
  _new_balance integer;
BEGIN
  -- Idempotent: skip if a signup_bonus transaction already exists for this user.
  SELECT EXISTS(
    SELECT 1 FROM public.barber_bucks_transactions
    WHERE user_id = _user_id AND transaction_type = 'signup_bonus'
  ) INTO _already;

  IF _already THEN
    SELECT barber_bucks INTO _new_balance FROM public.profiles WHERE user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'already', true, 'balance', COALESCE(_new_balance, 0));
  END IF;

  -- Lock the profile row, then add 15 BB.
  UPDATE public.profiles
  SET barber_bucks = COALESCE(barber_bucks, 0) + 15,
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING barber_bucks INTO _new_balance;

  IF _new_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  INSERT INTO public.barber_bucks_transactions
    (user_id, amount, transaction_type, description, balance_after)
  VALUES
    (_user_id, 15, 'signup_bonus', 'Welcome bonus: 15 BB on signup', _new_balance);

  RETURN jsonb_build_object('ok', true, 'already', false, 'balance', _new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.award_signup_bonus(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_signup_bonus(uuid) TO authenticated, service_role;