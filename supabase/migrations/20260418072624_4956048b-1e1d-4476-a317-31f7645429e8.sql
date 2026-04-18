-- Close stale battles that have been stuck in 'live' status with no recent activity.
-- Anything stuck in live for > 30 minutes without an update is ghost data.
UPDATE public.battles
SET status = 'completed',
    updated_at = now()
WHERE status IN ('live','active','voting')
  AND updated_at < (now() - interval '30 minutes');