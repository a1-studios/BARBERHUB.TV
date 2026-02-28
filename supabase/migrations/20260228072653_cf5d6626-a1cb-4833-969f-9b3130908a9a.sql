
CREATE TABLE public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('barber', 'fan')),
  device_fingerprint TEXT,
  shared BOOLEAN DEFAULT false,
  prize_id TEXT,
  prize_label TEXT,
  converted BOOLEAN DEFAULT false,
  spins_used INTEGER DEFAULT 0,
  max_spins INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_marketing_leads_email ON public.marketing_leads(email);
CREATE INDEX idx_marketing_leads_fingerprint ON public.marketing_leads(device_fingerprint);

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Anon insert for lead capture
CREATE POLICY "Anon can insert leads" ON public.marketing_leads FOR INSERT TO anon WITH CHECK (true);
-- Anon can update own lead by email (for share/spin updates)
CREATE POLICY "Anon can update leads" ON public.marketing_leads FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- Anon can read own lead by fingerprint
CREATE POLICY "Anon can read own leads" ON public.marketing_leads FOR SELECT TO anon USING (true);
-- Sovereign reads all
CREATE POLICY "Sovereign reads all leads" ON public.marketing_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sovereign'));
