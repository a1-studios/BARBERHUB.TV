
-- Access Code Engine + Public League Stats RPC (Phase 1 / Velvet Rope)

-- Seed global VIP mode flag (idempotent)
INSERT INTO public.platform_state (key, value)
VALUES ('global_vip_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- Tables
CREATE TABLE IF NOT EXISTS public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('vip','promo')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON public.access_codes(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.access_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_code ON public.access_code_redemptions(code_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.access_code_redemptions(user_id);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Sovereign-only direct access; all reads happen via SECURITY DEFINER RPCs
CREATE POLICY "Sovereign manages access codes"
  ON public.access_codes FOR ALL
  USING (public.is_sovereign())
  WITH CHECK (public.is_sovereign());

CREATE POLICY "Sovereign reads redemptions"
  ON public.access_code_redemptions FOR SELECT
  USING (public.is_sovereign());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_access_codes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_access_codes_updated_at ON public.access_codes;
CREATE TRIGGER trg_access_codes_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_access_codes_updated_at();

-- RPC: validate (no side effects, callable by anon)
CREATE OR REPLACE FUNCTION public.validate_access_code(p_code TEXT)
RETURNS TABLE(valid BOOLEAN, type TEXT, code_id UUID)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec public.access_codes%ROWTYPE;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID; RETURN;
  END IF;

  SELECT * INTO rec FROM public.access_codes
   WHERE code = upper(trim(p_code)) AND is_active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID; RETURN;
  END IF;

  IF rec.max_uses IS NOT NULL AND rec.usage_count >= rec.max_uses THEN
    RETURN QUERY SELECT false, rec.type, rec.id; RETURN;
  END IF;

  RETURN QUERY SELECT true, rec.type, rec.id;
END $$;

-- RPC: redeem (FOR UPDATE row lock — economy-integrity standard)
CREATE OR REPLACE FUNCTION public.redeem_access_code(
  p_code TEXT,
  p_user_id UUID,
  p_email TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec public.access_codes%ROWTYPE;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_code');
  END IF;

  SELECT * INTO rec FROM public.access_codes
   WHERE code = upper(trim(p_code)) AND is_active = true
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF rec.max_uses IS NOT NULL AND rec.usage_count >= rec.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'max_uses_reached');
  END IF;

  UPDATE public.access_codes
     SET usage_count = usage_count + 1
   WHERE id = rec.id;

  INSERT INTO public.access_code_redemptions(code_id, user_id, email)
  VALUES (rec.id, p_user_id, p_email);

  RETURN jsonb_build_object('success', true, 'type', rec.type, 'code_id', rec.id);
END $$;

-- RPC: global VIP mode flag (anon-callable convenience)
CREATE OR REPLACE FUNCTION public.is_global_vip_mode()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT value::boolean FROM public.platform_state WHERE key = 'global_vip_mode'), false);
$$;

-- RPC: aggregated public league stats (no PII)
CREATE OR REPLACE FUNCTION public.get_public_league_stats()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'barbers_total',           (SELECT count(*) FROM public.profiles WHERE user_type = 'barber'),
    'barbers_licensed_pro',    (SELECT count(*) FROM public.profiles WHERE user_type = 'barber' AND sub_category = 'licensed_pro'),
    'barbers_beginner',        (SELECT count(*) FROM public.profiles WHERE user_type = 'barber' AND sub_category = 'beginner'),
    'barbers_educator',        (SELECT count(*) FROM public.profiles WHERE user_type = 'barber' AND sub_category = 'educator'),
    'barbers_official_sponsor',(SELECT count(*) FROM public.profiles WHERE user_type = 'barber' AND sub_category = 'official_sponsor'),
    'fans_total',              (SELECT count(*) FROM public.profiles WHERE user_type = 'fan'),
    'active_battles',          (SELECT count(*) FROM public.battles WHERE status IN ('live','upcoming')),
    'live_battles',            (SELECT count(*) FROM public.battles WHERE status = 'live'),
    'countries_represented',   (SELECT count(DISTINCT country_code) FROM public.profiles WHERE country_code IS NOT NULL),
    'bb_in_circulation',       (SELECT COALESCE(sum(barber_bucks),0) FROM public.profiles)
  ) INTO result;
  RETURN result;
END $$;

-- Grants for anon/authenticated callers
GRANT EXECUTE ON FUNCTION public.validate_access_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_vip_mode() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_league_stats() TO anon, authenticated;
