CREATE TABLE IF NOT EXISTS public.promotion_gate_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL,
  ip_hash TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shown_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_gate_visitors_fingerprint
  ON public.promotion_gate_visitors(fingerprint);

CREATE INDEX IF NOT EXISTS idx_promotion_gate_visitors_ip_hash
  ON public.promotion_gate_visitors(ip_hash);

ALTER TABLE public.promotion_gate_visitors ENABLE ROW LEVEL SECURITY;

-- Lock down direct access; the edge function uses the service role key.
CREATE POLICY "Sovereign reads gate visitors"
  ON public.promotion_gate_visitors
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'sovereign'));

CREATE TRIGGER trg_promotion_gate_visitors_updated_at
BEFORE UPDATE ON public.promotion_gate_visitors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_timestamp();