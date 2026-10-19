/*
# Daily report schedule (21:00 Vietnam time = 14:00 UTC)

1. Extensions
- pg_cron + pg_net for scheduling the Telegram daily report edge function.

2. Jobs
- `telegram-daily-report`: POSTs to the daily-report function daily at 21:00 ICT.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'telegram-daily-report',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lsmwtrutauehrqfnvsyp.supabase.co/functions/v1/daily-report',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'telegram-daily-report'
);
