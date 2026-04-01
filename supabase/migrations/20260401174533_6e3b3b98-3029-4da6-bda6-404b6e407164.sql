
-- Step 1: Create the donated_services_inventory table
CREATE TABLE public.donated_services_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.barber_services(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('haircut', 'kids_cut', 'beard_trim', 'shape_up', 'full_cut_beard')),
  slot_datetime TIMESTAMPTZ NOT NULL,
  time_tier TEXT NOT NULL CHECK (time_tier IN ('prime_time', 'off_peak')),
  bb_value INTEGER NOT NULL DEFAULT 0,
  granted_perk_category TEXT NOT NULL CHECK (granted_perk_category IN ('subscription', 'battle_entry', 'visibility_boost')),
  granted_perk_details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'redeemed', 'expired')),
  barter_group_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.donated_services_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbers can view own donated inventory"
  ON public.donated_services_inventory FOR SELECT
  TO authenticated
  USING (barber_id = auth.uid());

-- No INSERT/UPDATE/DELETE for clients — only via RPC with service role

-- Step 2: Create the universal barter checkout RPC
CREATE OR REPLACE FUNCTION public.process_universal_barter_checkout(
  p_barber_id UUID,
  p_perk_category TEXT,
  p_perk_details JSONB,
  p_required_bb_value INTEGER,
  p_donated_slots JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot JSONB;
  v_service RECORD;
  v_slot_bb INTEGER;
  v_total_bb INTEGER := 0;
  v_group_id UUID := gen_random_uuid();
  v_tier_id UUID;
  v_sub_id UUID;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_time_tier TEXT;
  v_slot_datetime TIMESTAMPTZ;
  v_service_type TEXT;
  v_multiplier NUMERIC;
BEGIN
  -- Validate perk category
  IF p_perk_category NOT IN ('subscription', 'battle_entry', 'visibility_boost') THEN
    RAISE EXCEPTION 'Invalid perk category: %', p_perk_category;
  END IF;

  -- Validate required value
  IF p_required_bb_value <= 0 THEN
    RAISE EXCEPTION 'Required BB value must be positive';
  END IF;

  -- Validate donated slots is an array
  IF jsonb_typeof(p_donated_slots) != 'array' OR jsonb_array_length(p_donated_slots) = 0 THEN
    RAISE EXCEPTION 'Must donate at least one slot';
  END IF;

  -- First pass: validate all slots and calculate total value
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_donated_slots)
  LOOP
    -- Get service and verify ownership
    SELECT * INTO v_service
    FROM barber_services
    WHERE id = (v_slot->>'service_id')::UUID
      AND barber_user_id = p_barber_id
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Service % not found or not owned by barber', v_slot->>'service_id';
    END IF;

    v_slot_datetime := (v_slot->>'slot_datetime')::TIMESTAMPTZ;
    v_time_tier := v_slot->>'time_tier';
    v_service_type := v_slot->>'service_type';

    -- Validate slot is at least 24 hours in the future
    IF v_slot_datetime < (now() + interval '24 hours') THEN
      RAISE EXCEPTION 'Slots must be at least 24 hours in the future';
    END IF;

    -- Check slot is not already donated
    IF EXISTS (
      SELECT 1 FROM donated_services_inventory
      WHERE barber_id = p_barber_id
        AND slot_datetime = v_slot_datetime
        AND status = 'locked'
    ) THEN
      RAISE EXCEPTION 'Slot at % is already donated', v_slot_datetime;
    END IF;

    -- Calculate BB value with time tier multiplier
    IF v_time_tier = 'prime_time' THEN
      v_multiplier := 1.0;
    ELSE
      v_multiplier := 0.75;
    END IF;

    v_slot_bb := ROUND(v_service.price_bb * v_multiplier);
    v_total_bb := v_total_bb + v_slot_bb;
  END LOOP;

  -- Check total meets threshold
  IF v_total_bb < p_required_bb_value THEN
    RAISE EXCEPTION 'Insufficient barter value: % BB donated, % BB required', v_total_bb, p_required_bb_value;
  END IF;

  -- Second pass: insert all slots
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_donated_slots)
  LOOP
    SELECT * INTO v_service
    FROM barber_services
    WHERE id = (v_slot->>'service_id')::UUID;

    v_slot_datetime := (v_slot->>'slot_datetime')::TIMESTAMPTZ;
    v_time_tier := v_slot->>'time_tier';
    v_service_type := v_slot->>'service_type';

    IF v_time_tier = 'prime_time' THEN
      v_multiplier := 1.0;
    ELSE
      v_multiplier := 0.75;
    END IF;

    v_slot_bb := ROUND(v_service.price_bb * v_multiplier);

    INSERT INTO donated_services_inventory (
      barber_id, service_id, service_type, slot_datetime,
      time_tier, bb_value, granted_perk_category,
      granted_perk_details, status, barter_group_id
    ) VALUES (
      p_barber_id, (v_slot->>'service_id')::UUID, v_service_type,
      v_slot_datetime, v_time_tier, v_slot_bb,
      p_perk_category, p_perk_details, 'locked', v_group_id
    );
  END LOOP;

  -- Execute perk unlock based on category
  IF p_perk_category = 'subscription' THEN
    v_tier_id := (p_perk_details->>'tier_id')::UUID;
    IF v_tier_id IS NULL THEN
      RAISE EXCEPTION 'tier_id required for subscription perk';
    END IF;

    v_period_start := now();
    v_period_end := now() + interval '30 days';

    -- Deactivate existing active subscriptions
    UPDATE barber_subscriptions
    SET status = 'canceled', canceled_at = now(), updated_at = now()
    WHERE user_id = p_barber_id AND status = 'active';

    -- Create new subscription
    INSERT INTO barber_subscriptions (
      user_id, tier_id, status,
      current_period_start, current_period_end
    ) VALUES (
      p_barber_id, v_tier_id, 'active',
      v_period_start, v_period_end
    )
    RETURNING id INTO v_sub_id;

    -- Update barber profile
    UPDATE barber_profiles
    SET active_subscription_tier = (
      SELECT tier_name FROM barber_subscription_tiers WHERE id = v_tier_id
    ),
    subscription_expires_at = v_period_end,
    updated_at = now()
    WHERE user_id = p_barber_id;

  ELSIF p_perk_category = 'battle_entry' THEN
    -- Battle entry is handled by the caller after RPC returns success
    NULL;

  ELSIF p_perk_category = 'visibility_boost' THEN
    -- Update feed rank score for barber's content
    UPDATE feed_items
    SET promote_boost = promote_boost + COALESCE((p_perk_details->>'boost_amount')::INTEGER, 50),
        rank_score = rank_score + COALESCE((p_perk_details->>'boost_amount')::INTEGER, 50)
    WHERE creator_id = p_barber_id;
  END IF;

  -- Log audit trail
  INSERT INTO barber_bucks_transactions (
    user_id, amount, balance_after, transaction_type, description, reference_id
  ) VALUES (
    p_barber_id,
    0,
    COALESCE((SELECT balance FROM (SELECT SUM(amount) as balance FROM barber_bucks_transactions WHERE user_id = p_barber_id) t), 0),
    'barter_payment',
    format('Barter: %s BB in services for %s', v_total_bb, p_perk_category),
    v_group_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'barter_group_id', v_group_id,
    'total_bb_value', v_total_bb,
    'perk_category', p_perk_category,
    'slots_donated', jsonb_array_length(p_donated_slots)
  );
END;
$$;
