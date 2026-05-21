ALTER TABLE public.barber_profiles
  ADD COLUMN IF NOT EXISTS shop_address TEXT,
  ADD COLUMN IF NOT EXISTS shop_city TEXT,
  ADD COLUMN IF NOT EXISTS shop_state TEXT,
  ADD COLUMN IF NOT EXISTS shop_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS address_visibility TEXT NOT NULL DEFAULT 'approximate';

CREATE INDEX IF NOT EXISTS idx_barber_profiles_geo
  ON public.barber_profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;