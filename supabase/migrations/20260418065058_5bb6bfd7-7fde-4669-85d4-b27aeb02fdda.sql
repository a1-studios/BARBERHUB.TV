ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_active
  ON public.notifications(user_id, created_at DESC)
  WHERE dismissed_at IS NULL;