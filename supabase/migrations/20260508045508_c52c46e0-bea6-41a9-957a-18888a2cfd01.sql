
-- Revoke column-level SELECT on sensitive stream key columns in battles
REVOKE SELECT (ivs_stream_key, twilio_room_sid, barber1_stream_sid, barber2_stream_sid)
  ON public.battles FROM anon, authenticated;

-- Revoke column-level SELECT on verification_code in m4m_session_logs
REVOKE SELECT (verification_code)
  ON public.m4m_session_logs FROM anon, authenticated;
