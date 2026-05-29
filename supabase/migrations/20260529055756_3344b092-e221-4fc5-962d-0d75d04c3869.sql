CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_otp_codes TO service_role;

ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only edge functions (service role) touch this table.
CREATE INDEX IF NOT EXISTS phone_otp_codes_expires_at_idx ON public.phone_otp_codes (expires_at);