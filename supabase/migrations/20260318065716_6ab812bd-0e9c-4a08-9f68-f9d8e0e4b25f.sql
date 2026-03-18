
-- Add booking economy settings to barber_profiles
ALTER TABLE public.barber_profiles
  ADD COLUMN IF NOT EXISTS require_deposit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_no_show_fee_bb integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS booking_message text;

-- Add reliability tracking to client_profiles
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS total_appointments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0;
