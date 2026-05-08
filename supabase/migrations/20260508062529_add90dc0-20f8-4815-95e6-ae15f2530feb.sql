
-- 1. profiles: revoke column-level SELECT on financial columns from anon/authenticated
REVOKE SELECT (barber_bucks, total_earnings, referral_code) ON public.profiles FROM anon, authenticated;

-- 2. battles: revoke column-level SELECT on stream secret columns
REVOKE SELECT (ivs_stream_key, twilio_room_sid, barber1_stream_sid, barber2_stream_sid)
  ON public.battles FROM anon, authenticated;

-- 3. m4m_session_logs: revoke column-level SELECT on verification_code
REVOKE SELECT (verification_code) ON public.m4m_session_logs FROM anon, authenticated;

-- 4. reputation_scores: tighten SELECT policy — owner only; barbers use get_client_reputation() RPC
DROP POLICY IF EXISTS "Authenticated can read reputation scores" ON public.reputation_scores;
CREATE POLICY "Users can view their own reputation"
  ON public.reputation_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. barber_profiles: sanitize emails stored in name column + prevent future writes
UPDATE public.barber_profiles
SET name = split_part(name, '@', 1)
WHERE name ~* '@[a-z0-9.-]+\.[a-z]{2,}';

CREATE OR REPLACE FUNCTION public.prevent_email_in_barber_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.name ~* '@[a-z0-9.-]+\.[a-z]{2,}' THEN
    RAISE EXCEPTION 'Name cannot contain an email address';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_barber_name ON public.barber_profiles;
CREATE TRIGGER sanitize_barber_name
  BEFORE INSERT OR UPDATE OF name ON public.barber_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_email_in_barber_name();
