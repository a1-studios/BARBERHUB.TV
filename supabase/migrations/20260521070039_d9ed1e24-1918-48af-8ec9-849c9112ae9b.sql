
-- Phase 2: fan social handles
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS facebook_handle TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS youtube_handle TEXT;

-- Phase 3: phone on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Phase 4: country lock
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_locked_at TIMESTAMPTZ;

-- Backfill: any existing profile with a country is considered locked
UPDATE public.profiles
SET country_locked_at = COALESCE(country_locked_at, updated_at, now())
WHERE country_code IS NOT NULL AND country_locked_at IS NULL;

-- Trigger: stamp lock the first time country_code becomes non-null,
-- and prevent changes once locked (except by service_role / admins).
CREATE OR REPLACE FUNCTION public.enforce_country_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN := FALSE;
BEGIN
  -- Service role bypasses
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    IF NEW.country_code IS NOT NULL AND OLD.country_locked_at IS NULL THEN
      NEW.country_locked_at := now();
    END IF;
    RETURN NEW;
  END IF;

  -- Admin bypass
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;

  IF is_admin THEN
    IF NEW.country_code IS NOT NULL AND OLD.country_locked_at IS NULL THEN
      NEW.country_locked_at := now();
    END IF;
    RETURN NEW;
  END IF;

  -- Normal users: stamp lock on first set
  IF OLD.country_code IS NULL AND NEW.country_code IS NOT NULL THEN
    NEW.country_locked_at := now();
    RETURN NEW;
  END IF;

  -- Block changes once locked
  IF OLD.country_locked_at IS NOT NULL
     AND NEW.country_code IS DISTINCT FROM OLD.country_code THEN
    RAISE EXCEPTION 'country_code is locked after signup and cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_country_lock ON public.profiles;
CREATE TRIGGER trg_profiles_country_lock
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_country_lock();

-- Also stamp on INSERT if a country is provided immediately
CREATE OR REPLACE FUNCTION public.stamp_country_lock_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.country_code IS NOT NULL AND NEW.country_locked_at IS NULL THEN
    NEW.country_locked_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_country_lock_insert ON public.profiles;
CREATE TRIGGER trg_profiles_country_lock_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.stamp_country_lock_on_insert();
