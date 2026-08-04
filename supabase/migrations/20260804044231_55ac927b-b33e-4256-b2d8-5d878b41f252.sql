CREATE OR REPLACE FUNCTION public.adjust_barber_bucks(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_description text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_stripe_payment_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_new integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_user');
  END IF;

  IF p_stripe_payment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.barber_bucks_transactions
    WHERE stripe_payment_id = p_stripe_payment_id
  ) THEN
    SELECT COALESCE(barber_bucks, 0) INTO v_balance
    FROM public.profiles WHERE user_id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'balance', COALESCE(v_balance, 0));
  END IF;

  SELECT COALESCE(barber_bucks, 0) INTO v_balance
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_new := v_balance + p_amount;

  IF v_new < 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_funds',
      'balance', v_balance,
      'required', abs(p_amount),
      'shortfall', abs(p_amount) - v_balance
    );
  END IF;

  UPDATE public.profiles SET barber_bucks = v_new WHERE user_id = p_user_id;

  INSERT INTO public.barber_bucks_transactions (
    user_id, amount, balance_after, transaction_type, description, reference_id, stripe_payment_id
  ) VALUES (
    p_user_id, p_amount, v_new, p_transaction_type, p_description, p_reference_id, p_stripe_payment_id
  );

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'balance', v_new, 'previous_balance', v_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_barber_bucks(uuid, integer, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_barber_bucks(uuid, integer, text, text, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.adjust_barber_bucks(uuid, integer, text, text, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_barber_bucks(uuid, integer, text, text, uuid, text) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS barber_bucks_transactions_stripe_payment_id_uniq
  ON public.barber_bucks_transactions (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;