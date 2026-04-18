-- Insert the master tier toggle key (default ON for backward compatibility)
INSERT INTO public.platform_state (key, value, updated_at)
VALUES ('tiers_enabled', 'true', now())
ON CONFLICT (key) DO NOTHING;

-- Enable realtime broadcasts on platform_state so toggle changes propagate instantly
ALTER TABLE public.platform_state REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'platform_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_state;
  END IF;
END $$;