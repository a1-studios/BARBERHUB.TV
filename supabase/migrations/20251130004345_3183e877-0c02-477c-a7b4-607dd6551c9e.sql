-- Add phone_number to barber_profiles for tournament coordination
ALTER TABLE barber_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comment explaining purpose
COMMENT ON COLUMN barber_profiles.phone_number IS 'Contact phone number for battle coordination - required for barbers';