
-- 1. Add deposit_bb and is_free_intro to barber_services
ALTER TABLE public.barber_services 
  ADD COLUMN IF NOT EXISTS deposit_bb INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free_intro BOOLEAN NOT NULL DEFAULT false;

-- 2. Add is_deposit_only and remainder_bb to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_deposit_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS remainder_bb INTEGER NOT NULL DEFAULT 0;

-- 3. Create house_call_bounties table
CREATE TABLE IF NOT EXISTS public.house_call_bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  location_text TEXT NOT NULL,
  location_lat NUMERIC,
  location_lng NUMERIC,
  service_description TEXT,
  bounty_amount_bb INTEGER NOT NULL CHECK (bounty_amount_bb >= 500),
  preferred_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  claimed_by_barber_id UUID REFERENCES public.barber_profiles(id),
  claimed_by_user_id UUID REFERENCES public.profiles(user_id),
  claimed_at TIMESTAMPTZ,
  appointment_id UUID REFERENCES public.appointments(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.house_call_bounties ENABLE ROW LEVEL SECURITY;

-- 5. RLS: Authenticated can see all open bounties
CREATE POLICY "Anyone can view open bounties"
  ON public.house_call_bounties FOR SELECT
  TO authenticated
  USING (true);

-- 6. RLS: Clients can insert their own bounties
CREATE POLICY "Clients can insert own bounties"
  ON public.house_call_bounties FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- 7. RLS: Clients can update their own bounties (cancel)
CREATE POLICY "Clients can update own bounties"
  ON public.house_call_bounties FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid());

-- 8. RLS: Barbers can update bounties to claim (service role handles this via edge function)
-- Edge functions use service role so no additional RLS needed for claiming

-- 9. Anti-Gravity trigger: handle bounty status changes
CREATE OR REPLACE FUNCTION public.handle_bounty_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- On expired: refund client BB and notify
  IF NEW.status = 'expired' AND OLD.status = 'open' THEN
    UPDATE profiles 
    SET barber_bucks = COALESCE(barber_bucks, 0) + NEW.bounty_amount_bb
    WHERE user_id = NEW.client_id;

    INSERT INTO barber_bucks_transactions (user_id, amount, balance_after, transaction_type, description, reference_id)
    VALUES (
      NEW.client_id, 
      NEW.bounty_amount_bb,
      (SELECT barber_bucks FROM profiles WHERE user_id = NEW.client_id),
      'bounty_refund', 
      'Expired house call bounty refund',
      NEW.id::TEXT
    );

    PERFORM create_battle_notification(
      NEW.client_id, 'bounty_expired',
      '⏰ Bounty Expired', 
      'Your house call bounty expired. ' || NEW.bounty_amount_bb || ' BB refunded.',
      jsonb_build_object('bounty_id', NEW.id, 'refund_bb', NEW.bounty_amount_bb)
    );
  END IF;

  -- On claimed: notify client
  IF NEW.status = 'claimed' AND OLD.status = 'open' THEN
    PERFORM create_battle_notification(
      NEW.client_id, 'bounty_claimed',
      '🏠 Bounty Claimed!', 
      'A barber accepted your house call bounty!',
      jsonb_build_object('bounty_id', NEW.id, 'barber_id', NEW.claimed_by_barber_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bounty_status_change
  AFTER UPDATE OF status ON public.house_call_bounties
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bounty_status_change();

-- 10. Batch expiration function (for pg_cron)
CREATE OR REPLACE FUNCTION public.expire_bounties_batch()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE house_call_bounties
  SET status = 'expired'
  WHERE status = 'open' AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
