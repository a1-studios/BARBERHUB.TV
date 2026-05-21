-- pg_cron and pg_net are already installed on Supabase; do not recreate
DO $$
BEGIN
  PERFORM cron.unschedule('poll-stream-status-cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'poll-stream-status-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/poll-stream-status-cron',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdWVweWZzc292dmtqenBmanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjE1NDMsImV4cCI6MjA3MTg5NzU0M30.G5w88G7NxqUCX5hrafzg0VgwYd-MVYJh-DTeoVDQRiM"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);