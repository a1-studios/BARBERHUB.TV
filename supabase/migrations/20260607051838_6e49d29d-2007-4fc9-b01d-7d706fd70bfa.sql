
-- ============================================================
-- 1) barber_profiles: hide sensitive financial / Stripe columns
-- ============================================================
REVOKE SELECT (stripe_connect_id, stripe_payout_enabled, total_earnings_bb, total_withdrawn_bb, payout_minimum_bb)
  ON public.barber_profiles FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.get_my_barber_financials()
RETURNS TABLE (
  stripe_connect_id text,
  stripe_payout_enabled boolean,
  total_earnings_bb integer,
  total_withdrawn_bb integer,
  payout_minimum_bb integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bp.stripe_connect_id, bp.stripe_payout_enabled, bp.total_earnings_bb,
         bp.total_withdrawn_bb, bp.payout_minimum_bb
  FROM public.barber_profiles bp
  WHERE bp.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_barber_financials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_barber_financials() TO authenticated;

-- ============================================================
-- 2) battles: hide IVS credential columns + filter realtime publication
-- ============================================================
REVOKE SELECT (ivs_stream_key, ivs_channel_arn)
  ON public.battles FROM anon, authenticated, PUBLIC;

-- Replace the realtime publication entry for `battles` with a column list
-- that excludes ivs_stream_key and ivs_channel_arn so they are not broadcast.
ALTER PUBLICATION supabase_realtime DROP TABLE public.battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles (
  id, organizer_id, title, description, category, status, prize_amount, currency,
  cover_image_url, rules, max_participants, starts_at, ends_at, voting_ends_at,
  created_at, updated_at, barber1_id, barber2_id, creation1_id, creation2_id,
  vote_count1, vote_count2, stream_url, live_viewers, tournament_id, phase_id,
  round_number, match_number, is_tournament_match, youtube_stream_url, youtube_vod_url,
  barber_1_video_url, barber_2_video_url, winner_id, submission_deadline,
  forfeit_reason, forfeit_winner_id, barber1_live_viewers, barber2_live_viewers,
  last_viewer_check, barber1_youtube_video_id, barber2_youtube_video_id,
  barber1_peak_viewers, barber2_peak_viewers, twilio_room_sid, barber1_stream_sid,
  barber2_stream_sid, barber1_is_streaming, barber2_is_streaming,
  barber1_stream_started_at, barber2_stream_started_at, streaming_type, battle_type,
  ivs_playback_url, egress_id, cloudflare_stream_uid, match_mode
);

-- ============================================================
-- 3) academy_lessons: require authentication for SELECT
-- ============================================================
DROP POLICY IF EXISTS "Lessons visible to all" ON public.academy_lessons;
CREATE POLICY "Authenticated users can view lessons"
  ON public.academy_lessons
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.academy_lessons FROM anon;

-- ============================================================
-- 4) m4m_session_logs: hide plaintext verification_code from clients
-- ============================================================
REVOKE SELECT (verification_code) ON public.m4m_session_logs FROM anon, authenticated, PUBLIC;

-- ============================================================
-- 5) marketing_leads: harden anon insert with validation
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert leads" ON public.marketing_leads;
CREATE POLICY "Anon can insert validated leads"
  ON public.marketing_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND char_length(email) BETWEEN 5 AND 255
    AND email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
    AND (phone_number IS NULL OR char_length(phone_number) <= 40)
    AND (source_url IS NULL OR char_length(source_url) <= 2048)
    AND (device_fingerprint IS NULL OR char_length(device_fingerprint) <= 256)
    AND (country_code IS NULL OR char_length(country_code) <= 3)
  );
