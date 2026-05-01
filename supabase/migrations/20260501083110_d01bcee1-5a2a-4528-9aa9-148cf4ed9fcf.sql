-- Raffle entries table for the new lead-first funnel
CREATE TABLE public.raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('barber', 'fan')),
  country_code TEXT NOT NULL,
  zip_code TEXT,
  barber_status TEXT CHECK (barber_status IN ('licensed', 'student', 'unlicensed', 'beginner')),
  specialties TEXT[] DEFAULT '{}',
  bb_awarded INTEGER NOT NULL CHECK (bb_awarded BETWEEN 15 AND 50),
  draw_week DATE NOT NULL,
  device_fingerprint TEXT,
  ip_address TEXT,
  claimed_user_id UUID,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anti-fishing: one ticket per email
CREATE UNIQUE INDEX idx_raffle_entries_email_unique ON public.raffle_entries (lower(email));
CREATE INDEX idx_raffle_entries_draw_week ON public.raffle_entries (draw_week);
CREATE INDEX idx_raffle_entries_fingerprint ON public.raffle_entries (device_fingerprint);
CREATE INDEX idx_raffle_entries_ip ON public.raffle_entries (ip_address);
CREATE INDEX idx_raffle_entries_claimed_user ON public.raffle_entries (claimed_user_id);

ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;

-- Admins can read everything (for the Sunday draw + CSV export in Sovereign HQ)
CREATE POLICY "Admins can view all raffle entries"
ON public.raffle_entries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can read their own ticket (after they sign up + we link claimed_user_id)
CREATE POLICY "Users can view their own raffle entry"
ON public.raffle_entries
FOR SELECT
TO authenticated
USING (claimed_user_id = auth.uid());

-- No public INSERT/UPDATE/DELETE — all writes go through edge functions using service role.

-- Link marketing_leads to raffle ticket
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS raffle_ticket_code TEXT,
  ADD COLUMN IF NOT EXISTS spin_eligible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS barber_status TEXT,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';