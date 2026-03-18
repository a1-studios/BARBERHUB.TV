-- M4M Fund Summary RPC for Sovereign HQ
CREATE OR REPLACE FUNCTION public.get_m4m_fund_summary()
RETURNS TABLE(
  total_balance_bb bigint,
  total_from_donations bigint,
  total_from_pot_distribution bigint,
  total_from_tip_fees bigint,
  recent_deposits jsonb,
  deposit_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount_bb), 0)::bigint AS total_balance_bb,
    COALESCE(SUM(CASE WHEN source_type = 'battle_donation' THEN amount_bb ELSE 0 END), 0)::bigint AS total_from_donations,
    COALESCE(SUM(CASE WHEN source_type = 'pot_distribution' THEN amount_bb ELSE 0 END), 0)::bigint AS total_from_pot_distribution,
    COALESCE(SUM(CASE WHEN source_type = 'direct_tip_fee' THEN amount_bb ELSE 0 END), 0)::bigint AS total_from_tip_fees,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(r)) FROM (
        SELECT amount_bb, source_type, reference_id, created_at
        FROM m4m_fund_ledger
        ORDER BY created_at DESC
        LIMIT 10
      ) r),
      '[]'::jsonb
    ) AS recent_deposits,
    COUNT(*)::bigint AS deposit_count
  FROM m4m_fund_ledger;
END;
$$;
