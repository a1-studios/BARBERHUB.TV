
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
  IF v_uid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    a.id,
    COALESCE(a.appointment_type::text, 'appointment'),
    COALESCE(bs.name, INITCAP(REPLACE(a.appointment_type::text, '_', ' ')), 'Appointment')::text,
    CASE WHEN a.barber_user_id = v_uid THEN a.client_id ELSE a.barber_user_id END,
    a.scheduled_at,
    a.scheduled_at + (COALESCE(a.duration_minutes, 60) || ' minutes')::interval,
    COALESCE(a.status::text, 'scheduled'),
    jsonb_build_object(
      'service_name', bs.name,
      'duration_minutes', a.duration_minutes,
      'escrow_amount_bb', a.escrow_amount_bb,
      'intake_current_url', a.intake_current_url,
      'intake_reference_url', a.intake_reference_url,
      'intake_note', a.intake_note,
      'role', CASE WHEN a.barber_user_id = v_uid THEN 'barber' ELSE 'client' END
    )
  FROM public.appointments a
  LEFT JOIN public.barber_services bs ON bs.id = a.service_id
  WHERE (a.barber_user_id = v_uid OR a.client_id = v_uid)
    AND a.scheduled_at >= p_from
    AND a.scheduled_at <  p_to

  UNION ALL
  SELECT
    cb.id,
    'chair_swap'::text,
    COALESCE(cl.shop_name, cl.chair_name)::text,
    CASE WHEN cb.owner_user_id = v_uid THEN cb.renter_user_id ELSE cb.owner_user_id END,
    cb.start_date::timestamptz,
    (cb.end_date + 1)::timestamptz,
    cb.status,
    jsonb_build_object(
      'listing_id', cb.listing_id,
      'total_bb', cb.total_bb,
      'side', CASE WHEN cb.owner_user_id = v_uid THEN 'owner' ELSE 'renter' END
    )
  FROM public.chair_bookings cb
  JOIN public.chair_listings cl ON cl.id = cb.listing_id
  WHERE (cb.owner_user_id = v_uid OR cb.renter_user_id = v_uid)
    AND cb.start_date <  p_to::date
    AND cb.end_date   >= p_from::date

  ORDER BY starts_at ASC;
END;
$$;
