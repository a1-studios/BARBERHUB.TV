
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name_changed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.update_display_name(new_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  cleaned TEXT;
  last_change TIMESTAMPTZ;
  next_allowed TIMESTAMPTZ;
  cooldown INTERVAL := INTERVAL '3 months';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  cleaned := btrim(COALESCE(new_name, ''));

  IF length(cleaned) < 3 OR length(cleaned) > 24 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Display name must be 3–24 characters.');
  END IF;

  IF cleaned ~* '@' OR cleaned ~* '\s' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No spaces or "@" allowed.');
  END IF;

  IF cleaned !~ '^[A-Za-z0-9._-]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only letters, numbers, dot, underscore, dash.');
  END IF;

  SELECT display_name_changed_at INTO last_change
    FROM public.profiles WHERE user_id = uid;

  IF last_change IS NOT NULL AND last_change + cooldown > now() THEN
    next_allowed := last_change + cooldown;
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'You can change your display name again on ' || to_char(next_allowed, 'Mon DD, YYYY') || '.',
      'next_allowed_at', next_allowed
    );
  END IF;

  -- Uniqueness (case-insensitive) against existing display names
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id <> uid AND lower(display_name) = lower(cleaned)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That name is already taken.');
  END IF;

  UPDATE public.profiles
     SET display_name = cleaned,
         display_name_changed_at = now(),
         updated_at = now()
   WHERE user_id = uid;

  RETURN jsonb_build_object('ok', true, 'display_name', cleaned, 'changed_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.update_display_name(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_display_name(TEXT) TO authenticated;
