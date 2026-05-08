
-- 1. Drop redundant always-true UPDATE policies (service_role bypasses RLS)
DROP POLICY IF EXISTS "service_role_update_leads" ON public.marketing_leads;
DROP POLICY IF EXISTS "Service role updates queue entries" ON public.tournament_queue;
DROP POLICY IF EXISTS "Service role updates challenges" ON public.open_challenges;

-- Also drop one duplicate anon-insert policy on marketing_leads (keep the other)
DROP POLICY IF EXISTS "anon_insert_lead" ON public.marketing_leads;

-- 2. Revoke API access to barber_stats materialized view
REVOKE ALL ON public.barber_stats FROM anon, authenticated;

-- 3. Pin search_path on the two flagged functions
ALTER FUNCTION public.get_nationality_match_priority(text, text) SET search_path = public;
ALTER FUNCTION public.update_updated_at_timestamp() SET search_path = public;
