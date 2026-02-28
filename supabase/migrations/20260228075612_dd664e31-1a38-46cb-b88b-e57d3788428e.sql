
-- Add M4M fields to barber_profiles
ALTER TABLE barber_profiles
  ADD COLUMN m4m_certified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN m4m_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN m4m_lives_touched INTEGER NOT NULL DEFAULT 0;

-- Session verification log
CREATE TABLE public.m4m_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_m4m_code ON public.m4m_session_logs(verification_code);
ALTER TABLE public.m4m_session_logs ENABLE ROW LEVEL SECURITY;

-- Barbers can insert (generate codes) and read own logs
CREATE POLICY "Barbers manage own m4m logs"
  ON public.m4m_session_logs FOR ALL TO authenticated
  USING (barber_user_id = auth.uid())
  WITH CHECK (barber_user_id = auth.uid());

-- Clients can update to verify
CREATE POLICY "Clients can verify sessions"
  ON public.m4m_session_logs FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (client_user_id = auth.uid() AND verified = true);

-- Anyone authenticated can read verified sessions (for display counts)
CREATE POLICY "Anyone can read verified sessions"
  ON public.m4m_session_logs FOR SELECT TO authenticated
  USING (verified = true);

-- Function to verify an M4M session and increment lives touched
CREATE OR REPLACE FUNCTION public.verify_m4m_session(p_code TEXT, p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log RECORD;
BEGIN
  -- Find unverified log by code
  SELECT * INTO v_log
  FROM m4m_session_logs
  WHERE verification_code = p_code
    AND verified = false
    AND created_at > NOW() - INTERVAL '24 hours'
  LIMIT 1;

  IF v_log IS NULL THEN
    RETURN false;
  END IF;

  -- Mark as verified
  UPDATE m4m_session_logs
  SET verified = true,
      client_user_id = p_client_id,
      verified_at = NOW()
  WHERE id = v_log.id;

  -- Increment lives touched
  UPDATE barber_profiles
  SET m4m_lives_touched = m4m_lives_touched + 1
  WHERE user_id = v_log.barber_user_id;

  RETURN true;
END;
$$;
