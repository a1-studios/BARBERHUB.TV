-- Purge ghost solo broadcasts: any barber marked is_live but no heartbeat in 30 sec
UPDATE public.barber_profiles
SET is_live = false,
    live_video_id = null
WHERE is_live = true
  AND (last_live_check IS NULL OR last_live_check < (now() - interval '30 seconds'));

-- Purge ghost battles: anything stuck active/live without a fresh heartbeat (>30 sec) is closed
UPDATE public.battles
SET status = 'completed',
    barber1_is_streaming = false,
    barber2_is_streaming = false,
    updated_at = now()
WHERE status IN ('live','active')
  AND updated_at < (now() - interval '30 seconds');