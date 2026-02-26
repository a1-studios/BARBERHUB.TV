
-- Create appointment type enum
CREATE TYPE appointment_type AS ENUM ('standard', 'house_call', 'sos');

-- Create appointment status enum
CREATE TYPE appointment_status AS ENUM ('pending', 'escrow_locked', 'confirmed', 'in_transit', 'completed', 'cancelled', 'no_show', 'denied');

-- ============================================
-- Table: barber_services
-- ============================================
CREATE TABLE public.barber_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES barber_profiles(id) ON DELETE CASCADE,
  barber_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  price_bb INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  allows_house_call BOOLEAN NOT NULL DEFAULT false,
  allows_sos BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
  ON public.barber_services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Barbers can manage own services"
  ON public.barber_services FOR ALL
  USING (auth.uid() = barber_user_id)
  WITH CHECK (auth.uid() = barber_user_id);

CREATE INDEX idx_barber_services_barber ON public.barber_services(barber_id);

CREATE TRIGGER update_barber_services_updated_at
  BEFORE UPDATE ON public.barber_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Table: barber_availability
-- ============================================
CREATE TABLE public.barber_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES barber_profiles(id) ON DELETE CASCADE,
  barber_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(barber_id, day_of_week)
);

ALTER TABLE public.barber_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability"
  ON public.barber_availability FOR SELECT
  USING (true);

CREATE POLICY "Barbers can manage own availability"
  ON public.barber_availability FOR ALL
  USING (auth.uid() = barber_user_id)
  WITH CHECK (auth.uid() = barber_user_id);

CREATE INDEX idx_barber_availability_barber ON public.barber_availability(barber_id);

-- ============================================
-- Table: appointments
-- ============================================
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barber_profiles(id) ON DELETE CASCADE,
  barber_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  service_id UUID REFERENCES barber_services(id) ON DELETE SET NULL,
  appointment_type appointment_type NOT NULL DEFAULT 'standard',
  status appointment_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  escrow_amount_bb INTEGER NOT NULL DEFAULT 0,
  platform_fee_bb INTEGER NOT NULL DEFAULT 0,
  client_location_text TEXT,
  client_lat NUMERIC,
  client_lng NUMERIC,
  sos_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  notes TEXT,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Barbers can view their appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = barber_user_id);

CREATE POLICY "System can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (false);

CREATE POLICY "System can update appointments"
  ON public.appointments FOR UPDATE
  USING (false);

CREATE INDEX idx_appointments_client ON public.appointments(client_id);
CREATE INDEX idx_appointments_barber ON public.appointments(barber_id);
CREATE INDEX idx_appointments_scheduled ON public.appointments(barber_id, scheduled_at);
CREATE INDEX idx_appointments_status ON public.appointments(status);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Table: barber_blocked_slots
-- ============================================
CREATE TABLE public.barber_blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES barber_profiles(id) ON DELETE CASCADE,
  barber_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  blocked_start TIMESTAMPTZ NOT NULL,
  blocked_end TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.barber_blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked slots"
  ON public.barber_blocked_slots FOR SELECT
  USING (true);

CREATE POLICY "Barbers can manage own blocked slots"
  ON public.barber_blocked_slots FOR ALL
  USING (auth.uid() = barber_user_id)
  WITH CHECK (auth.uid() = barber_user_id);

CREATE INDEX idx_blocked_slots_barber ON public.barber_blocked_slots(barber_id);
CREATE INDEX idx_blocked_slots_range ON public.barber_blocked_slots(barber_id, blocked_start, blocked_end);
