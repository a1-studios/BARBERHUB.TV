-- Wipe ghost battles: anything stuck in live/active without a fresh heartbeat (>2 min) is closed
UPDATE public.battles
SET status = 'completed',
    barber1_is_streaming = false,
    barber2_is_streaming = false,
    updated_at = now()
WHERE status IN ('live','active')
  AND updated_at < (now() - interval '2 minutes');