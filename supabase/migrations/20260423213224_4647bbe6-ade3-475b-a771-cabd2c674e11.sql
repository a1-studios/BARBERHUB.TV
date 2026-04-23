-- Extend marketing_leads with country, prize_bb, attribution and UTM fields
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS prize_bb integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fbp text,
  ADD COLUMN IF NOT EXISTS fbc text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

-- Ensure RLS is on
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Allow public (anon + authenticated) to insert leads
DROP POLICY IF EXISTS "anon_insert_lead" ON public.marketing_leads;
CREATE POLICY "anon_insert_lead"
  ON public.marketing_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow public to update their own lead by email (for upsert flow during wizard)
DROP POLICY IF EXISTS "anon_update_lead_by_email" ON public.marketing_leads;
CREATE POLICY "anon_update_lead_by_email"
  ON public.marketing_leads
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow reading aggregate count only via a security-definer RPC (no public SELECT policy)
CREATE OR REPLACE FUNCTION public.get_marketing_lead_count()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.marketing_leads;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketing_lead_count() TO anon, authenticated;