
-- =========================================================
-- CHAIR SWAP MODULE
-- =========================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.chair_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  shop_name text,
  chair_name text NOT NULL,
  description text,
  address text,
  city text,
  country_code text,
  latitude numeric,
  longitude numeric,
  daily_rate_bb integer NOT NULL CHECK (daily_rate_bb > 0),
  weekly_rate_bb integer,
  amenities text[] NOT NULL DEFAULT '{}',
  photo_urls text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chair_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chair_listings TO authenticated;
GRANT ALL ON public.chair_listings TO service_role;

ALTER TABLE public.chair_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active chair listings are publicly viewable"
  ON public.chair_listings FOR SELECT
  USING (is_active = true OR owner_user_id = auth.uid());

CREATE POLICY "Owners insert own chair listings"
  ON public.chair_listings FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners update own chair listings"
  ON public.chair_listings FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners delete own chair listings"
  ON public.chair_listings FOR DELETE
  USING (auth.uid() = owner_user_id);

CREATE TRIGGER chair_listings_updated
  BEFORE UPDATE ON public.chair_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_timestamp();

CREATE INDEX chair_listings_owner_idx ON public.chair_listings(owner_user_id);
CREATE INDEX chair_listings_geo_idx ON public.chair_listings(latitude, longitude) WHERE is_active = true;


CREATE TABLE public.chair_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.chair_listings(id) ON DELETE CASCADE,
  available_from date NOT NULL,
  available_to date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_to >= available_from)
);

GRANT SELECT ON public.chair_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chair_availability TO authenticated;
GRANT ALL ON public.chair_availability TO service_role;

ALTER TABLE public.chair_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is publicly viewable"
  ON public.chair_availability FOR SELECT USING (true);

CREATE POLICY "Owners manage availability"
  ON public.chair_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM public.chair_listings l WHERE l.id = listing_id AND l.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chair_listings l WHERE l.id = listing_id AND l.owner_user_id = auth.uid()));

CREATE INDEX chair_availability_listing_idx ON public.chair_availability(listing_id, available_from, available_to);


CREATE TABLE public.chair_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.chair_listings(id) ON DELETE CASCADE,
  renter_user_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_bb integer NOT NULL,
  platform_fee_bb integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  EXCLUDE USING gist (
    listing_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status = 'confirmed')
);

GRANT SELECT, INSERT ON public.chair_bookings TO authenticated;
GRANT ALL ON public.chair_bookings TO service_role;

ALTER TABLE public.chair_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and renters view own bookings"
  ON public.chair_bookings FOR SELECT
  USING (renter_user_id = auth.uid() OR owner_user_id = auth.uid());

CREATE INDEX chair_bookings_renter_idx ON public.chair_bookings(renter_user_id, start_date);
CREATE INDEX chair_bookings_owner_idx ON public.chair_bookings(owner_user_id, start_date);
CREATE INDEX chair_bookings_listing_idx ON public.chair_bookings(listing_id, start_date);


-- =========================================================
-- book_chair RPC (BB escrow + atomic booking)
-- =========================================================
CREATE OR REPLACE FUNCTION public.book_chair(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_listing      RECORD;
  v_renter_id    uuid := auth.uid();
  v_renter_bb    integer;
  v_owner_bb     integer;
  v_days         integer;
  v_total_bb     integer;
  v_platform_bb  integer;
  v_owner_net_bb integer;
  v_booking_id   uuid;
BEGIN
  IF v_renter_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'End date must be on or after start date';
  END IF;

  SELECT * INTO v_listing FROM public.chair_listings WHERE id = p_listing_id AND is_active = true;
  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'Listing not found or inactive';
  END IF;
  IF v_listing.owner_user_id = v_renter_id THEN
    RAISE EXCEPTION 'Cannot book your own chair';
  END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_listing.weekly_rate_bb IS NOT NULL AND v_days >= 7 THEN
    v_total_bb := (v_days / 7) * v_listing.weekly_rate_bb + (v_days % 7) * v_listing.daily_rate_bb;
  ELSE
    v_total_bb := v_days * v_listing.daily_rate_bb;
  END IF;

  v_platform_bb  := FLOOR(v_total_bb * 0.05);
  v_owner_net_bb := v_total_bb - v_platform_bb;

  -- Lock renter
  SELECT barber_bucks INTO v_renter_bb FROM public.profiles WHERE user_id = v_renter_id FOR UPDATE;
  IF v_renter_bb IS NULL OR v_renter_bb < v_total_bb THEN
    RAISE EXCEPTION 'Insufficient Barber Bucks (need %)', v_total_bb;
  END IF;

  -- Debit renter
  UPDATE public.profiles SET barber_bucks = barber_bucks - v_total_bb, updated_at = now()
    WHERE user_id = v_renter_id;
  INSERT INTO public.barber_bucks_transactions (user_id, amount, balance_after, transaction_type, description, reference_id)
    VALUES (v_renter_id, -v_total_bb, v_renter_bb - v_total_bb, 'chair_swap_payment',
            'Chair rental: ' || COALESCE(v_listing.shop_name, v_listing.chair_name), p_listing_id);

  -- Insert booking (GiST exclusion will reject overlaps)
  INSERT INTO public.chair_bookings (listing_id, renter_user_id, owner_user_id, start_date, end_date, total_bb, platform_fee_bb)
    VALUES (p_listing_id, v_renter_id, v_listing.owner_user_id, p_start_date, p_end_date, v_total_bb, v_platform_bb)
    RETURNING id INTO v_booking_id;

  -- Credit owner (net of platform fee)
  SELECT barber_bucks INTO v_owner_bb FROM public.profiles WHERE user_id = v_listing.owner_user_id FOR UPDATE;
  UPDATE public.profiles SET barber_bucks = COALESCE(barber_bucks, 0) + v_owner_net_bb, updated_at = now()
    WHERE user_id = v_listing.owner_user_id;
  INSERT INTO public.barber_bucks_transactions (user_id, amount, balance_after, transaction_type, description, reference_id)
    VALUES (v_listing.owner_user_id, v_owner_net_bb, COALESCE(v_owner_bb, 0) + v_owner_net_bb,
            'chair_swap_payout', 'Chair rental payout', v_booking_id);

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'total_bb', v_total_bb,
    'platform_fee_bb', v_platform_bb,
    'owner_net_bb', v_owner_net_bb,
    'days', v_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_chair(uuid, date, date) TO authenticated;


-- =========================================================
-- find_chairs_nearby RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.find_chairs_nearby(
  p_lat numeric,
  p_lng numeric,
  p_radius_miles numeric DEFAULT 25,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_amenities text[] DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  owner_user_id uuid,
  shop_name text,
  chair_name text,
  description text,
  address text,
  latitude numeric,
  longitude numeric,
  daily_rate_bb integer,
  weekly_rate_bb integer,
  amenities text[],
  photo_urls text[],
  distance_miles numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    cl.id, cl.owner_user_id, cl.shop_name, cl.chair_name, cl.description,
    cl.address, cl.latitude, cl.longitude, cl.daily_rate_bb, cl.weekly_rate_bb,
    cl.amenities, cl.photo_urls,
    (3959 * acos(
      cos(radians(p_lat)) * cos(radians(cl.latitude))
      * cos(radians(cl.longitude) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(cl.latitude))
    ))::numeric AS distance_miles
  FROM public.chair_listings cl
  WHERE cl.is_active = true
    AND cl.latitude IS NOT NULL
    AND cl.longitude IS NOT NULL
    AND (3959 * acos(
      cos(radians(p_lat)) * cos(radians(cl.latitude))
      * cos(radians(cl.longitude) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(cl.latitude))
    )) <= p_radius_miles
    AND (p_amenities IS NULL OR cl.amenities @> p_amenities)
    AND (
      p_start_date IS NULL OR p_end_date IS NULL OR EXISTS (
        SELECT 1 FROM public.chair_availability ca
        WHERE ca.listing_id = cl.id
          AND ca.available_from <= p_start_date
          AND ca.available_to   >= p_end_date
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.chair_bookings cb
      WHERE cb.listing_id = cl.id
        AND cb.status = 'confirmed'
        AND p_start_date IS NOT NULL AND p_end_date IS NOT NULL
        AND daterange(cb.start_date, cb.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
    )
  ORDER BY distance_miles ASC;
$$;

GRANT EXECUTE ON FUNCTION public.find_chairs_nearby(numeric, numeric, numeric, date, date, text[]) TO anon, authenticated;


-- =========================================================
-- DUAL-IMAGE INTAKE FIELDS on appointments
-- =========================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS intake_current_url   text,
  ADD COLUMN IF NOT EXISTS intake_reference_url text,
  ADD COLUMN IF NOT EXISTS intake_note          text;


-- =========================================================
-- UNIFIED CALENDAR RPC
-- Aggregates appointments + chair bookings + bounties
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_unified_calendar_events(
  p_from timestamptz,
  p_to   timestamptz
) RETURNS TABLE(
  event_id        uuid,
  event_type      text,
  title           text,
  counterparty_id uuid,
  starts_at       timestamptz,
  ends_at         timestamptz,
  status          text,
  metadata        jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Appointments (covers appointment / house_call / sos via appointment_type)
  SELECT
    a.id,
    COALESCE(a.appointment_type, 'appointment')::text,
    COALESCE(a.service_name, 'Appointment')::text,
    CASE WHEN a.barber_user_id = v_uid THEN a.client_id ELSE a.barber_user_id END,
    a.appointment_at,
    COALESCE(a.appointment_at + (COALESCE(a.duration_minutes, 60) || ' minutes')::interval,
             a.appointment_at + interval '60 minutes'),
    COALESCE(a.status, 'scheduled')::text,
    jsonb_build_object(
      'service_name', a.service_name,
      'duration_minutes', a.duration_minutes,
      'price_bb', a.price_bb,
      'intake_current_url', a.intake_current_url,
      'intake_reference_url', a.intake_reference_url,
      'intake_note', a.intake_note
    )
  FROM public.appointments a
  WHERE (a.barber_user_id = v_uid OR a.client_id = v_uid)
    AND a.appointment_at >= p_from
    AND a.appointment_at <  p_to

  UNION ALL
  -- Chair Swap bookings (full-day events)
  SELECT
    cb.id,
    'chair_swap'::text,
    COALESCE(cl.shop_name, cl.chair_name)::text,
    CASE WHEN cb.owner_user_id = v_uid THEN cb.renter_user_id ELSE cb.owner_user_id END,
    (cb.start_date::timestamptz),
    ((cb.end_date + 1)::timestamptz),
    cb.status,
    jsonb_build_object(
      'listing_id', cb.listing_id,
      'total_bb', cb.total_bb,
      'side', CASE WHEN cb.owner_user_id = v_uid THEN 'owner' ELSE 'renter' END
    )
  FROM public.chair_bookings cb
  JOIN public.chair_listings cl ON cl.id = cb.listing_id
  WHERE (cb.owner_user_id = v_uid OR cb.renter_user_id = v_uid)
    AND cb.start_date < p_to::date
    AND cb.end_date   >= p_from::date

  ORDER BY starts_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unified_calendar_events(timestamptz, timestamptz) TO authenticated;
