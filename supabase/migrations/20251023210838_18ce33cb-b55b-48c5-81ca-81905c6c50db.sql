-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to sync battle viewers every 10 seconds
SELECT cron.schedule(
  'sync-battle-viewers-job',
  '*/10 * * * * *',  -- Every 10 seconds (seconds supported in pg_cron)
  $$
  SELECT net.http_post(
    url := 'https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/sync-battle-viewers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Note: If pg_cron doesn't support seconds, use this alternative (every minute):
-- SELECT cron.schedule(
--   'sync-battle-viewers-job',
--   '* * * * *',  -- Every minute
--   $$
--   SELECT net.http_post(
--     url := 'https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/sync-battle-viewers',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
--     ),
--     body := '{}'::jsonb
--   ) as request_id;
--   $$
-- );