
-- Update the RPC to handle all fields used by the client
DROP FUNCTION IF EXISTS public.update_marketing_lead_by_fingerprint(text, boolean, text, integer, boolean);

CREATE OR REPLACE FUNCTION public.update_marketing_lead_by_fingerprint(
  p_fingerprint text,
  p_shared boolean DEFAULT NULL,
  p_prize_id text DEFAULT NULL,
  p_prize_label text DEFAULT NULL,
  p_spins_used integer DEFAULT NULL,
  p_converted boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketing_leads
  SET 
    shared = COALESCE(p_shared, shared),
    prize_id = COALESCE(p_prize_id, prize_id),
    prize_label = COALESCE(p_prize_label, prize_label),
    spins_used = COALESCE(p_spins_used, spins_used),
    converted = COALESCE(p_converted, converted)
  WHERE device_fingerprint = p_fingerprint;
END;
$$;
