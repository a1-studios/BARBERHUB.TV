CREATE OR REPLACE FUNCTION public.process_battle_donation(
    p_battle_id uuid,
    p_donor_id uuid,
    p_barber_id uuid,
    p_amount_bb integer,
    p_message text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_battle RECORD;
    v_donor_balance INTEGER;
    v_m4m_amount INTEGER;
    v_platform_amount INTEGER;
    v_pool_amount INTEGER;
    v_donation_id UUID;
    v_donor_name TEXT;
    v_category TEXT;
    v_pool_amount_cents INTEGER;
    v_platform_amount_cents INTEGER;
BEGIN
    IF p_amount_bb < 5 THEN
        RAISE EXCEPTION 'Minimum donation is 5 BB';
    END IF;

    SELECT id, status, title, category INTO v_battle
    FROM public.battles
    WHERE id = p_battle_id;

    IF v_battle IS NULL THEN
        RAISE EXCEPTION 'Battle not found';
    END IF;

    IF v_battle.status NOT IN ('active', 'voting', 'live') THEN
        RAISE EXCEPTION 'Battle is not accepting donations';
    END IF;

    -- Lock donor profile
    SELECT barber_bucks, display_name INTO v_donor_balance, v_donor_name
    FROM public.profiles
    WHERE user_id = p_donor_id
    FOR UPDATE;

    IF v_donor_balance < p_amount_bb THEN
        RAISE EXCEPTION 'Insufficient Barber Bucks';
    END IF;

    -- Deduct full amount from donor
    UPDATE public.profiles
    SET barber_bucks = barber_bucks - p_amount_bb,
        updated_at = now()
    WHERE user_id = p_donor_id;

    INSERT INTO public.barber_bucks_transactions (
        user_id, amount, balance_after, transaction_type, description, reference_id
    ) VALUES (
        p_donor_id, -p_amount_bb, v_donor_balance - p_amount_bb, 'battle_donation',
        'Donation to battle: ' || v_battle.title, p_battle_id
    );

    -- Record full donation for receipts & tug-of-war
    INSERT INTO public.battle_donations (
        battle_id, donor_id, donor_name, barber_id, amount_bb, message
    ) VALUES (
        p_battle_id, p_donor_id, COALESCE(v_donor_name, 'Anonymous'), p_barber_id,
        p_amount_bb, SUBSTRING(p_message FROM 1 FOR 200)
    ) RETURNING id INTO v_donation_id;

    -- ─── NEW SPLIT: 80% pool / 15% platform / 5% M4M ───
    v_m4m_amount      := FLOOR(p_amount_bb * 0.05);
    v_platform_amount := FLOOR(p_amount_bb * 0.15);
    v_pool_amount     := p_amount_bb - v_m4m_amount - v_platform_amount;

    -- A. M4M Fund (5%)
    IF v_m4m_amount > 0 THEN
        INSERT INTO public.m4m_fund_ledger (amount_bb, source_type, reference_id)
        VALUES (v_m4m_amount, 'battle_donation', v_donation_id);
    END IF;

    -- B. Platform fees (15%) — recorded into category_prize_pools.platform_fees_collected_cents
    -- C. Category prize pool (80%)
    v_category := COALESCE(v_battle.category, 'open');
    v_pool_amount_cents     := v_pool_amount * 20;     -- 1 BB = 20 cents
    v_platform_amount_cents := v_platform_amount * 20;

    INSERT INTO public.category_prize_pools (
        category, tournament_year, total_pool_cents,
        donation_contributions_cents, platform_fees_collected_cents
    ) VALUES (
        v_category, EXTRACT(YEAR FROM NOW())::INTEGER,
        v_pool_amount_cents,
        v_pool_amount_cents,
        v_platform_amount_cents
    )
    ON CONFLICT (category, tournament_year) DO UPDATE SET
        total_pool_cents             = category_prize_pools.total_pool_cents + EXCLUDED.total_pool_cents,
        donation_contributions_cents = category_prize_pools.donation_contributions_cents + EXCLUDED.donation_contributions_cents,
        platform_fees_collected_cents= category_prize_pools.platform_fees_collected_cents + EXCLUDED.platform_fees_collected_cents,
        last_updated = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'donation_id', v_donation_id,
        'amount_bb', p_amount_bb,
        'new_balance', v_donor_balance - p_amount_bb,
        'splits', jsonb_build_object(
            'category_pool_bb', v_pool_amount,
            'platform_fee_bb', v_platform_amount,
            'm4m_fund_bb', v_m4m_amount
        )
    );
END;
$function$;