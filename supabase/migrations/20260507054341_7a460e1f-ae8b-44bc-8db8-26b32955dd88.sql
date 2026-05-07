
-- 1. Lock down marketing_leads UPDATE (was USING true)
DROP POLICY IF EXISTS "anon_update_lead_by_email" ON public.marketing_leads;
CREATE POLICY "service_role_update_leads" ON public.marketing_leads
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- 2. tournament_queue UPDATE restrict to service_role
DROP POLICY IF EXISTS "System can update queue entries" ON public.tournament_queue;
CREATE POLICY "Service role updates queue entries" ON public.tournament_queue
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- 3. open_challenges UPDATE restrict to service_role
DROP POLICY IF EXISTS "System can update challenges" ON public.open_challenges;
CREATE POLICY "Service role updates challenges" ON public.open_challenges
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- 4. m4m_session_logs - Clients verify sessions: restrict USING
DROP POLICY IF EXISTS "Clients can verify sessions" ON public.m4m_session_logs;
CREATE POLICY "Clients can verify sessions" ON public.m4m_session_logs
  FOR UPDATE TO authenticated
  USING (client_user_id = auth.uid() OR client_user_id IS NULL)
  WITH CHECK (client_user_id = auth.uid() AND verified = true);

-- 5. stream_sessions SELECT - restrict to owner
DROP POLICY IF EXISTS "Authenticated users can view stream sessions" ON public.stream_sessions;
CREATE POLICY "Owners view their stream sessions" ON public.stream_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 6. house_call_bounties SELECT - restrict to client + barbers
DROP POLICY IF EXISTS "Anyone can view open bounties" ON public.house_call_bounties;
CREATE POLICY "Clients and barbers view bounties" ON public.house_call_bounties
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'barber'::app_role));

-- 7. Column-level revokes for sensitive fields
REVOKE SELECT (ivs_stream_key) ON public.battles FROM anon, authenticated;
REVOKE SELECT (phone_number) ON public.barber_profiles FROM anon, authenticated;
REVOKE SELECT (barber_bucks, total_earnings) ON public.profiles FROM anon, authenticated;
REVOKE SELECT (verification_code) ON public.m4m_session_logs FROM anon, authenticated;
REVOKE SELECT (room_sid, participant_sid, recording_sid, error_message) ON public.stream_sessions FROM anon, authenticated;

-- 8. is_sovereign RPC so client guard doesn't need email
CREATE OR REPLACE FUNCTION public.is_sovereign()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'sovereign'::app_role);
$$;
REVOKE EXECUTE ON FUNCTION public.is_sovereign() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_sovereign() TO authenticated;
