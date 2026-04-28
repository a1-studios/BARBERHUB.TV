## What's broken

- **Domain**: `notify.barberhub.tv` is verified ✅
- **auth-email-hook function**: deployed and correctly written ✅
- **Database queue infrastructure**: NOT provisioned ❌ ← this is the actual blocker

The hook fires when Supabase Auth needs to send a password reset / magic link / signup confirmation. It tries to call `supabase.rpc('enqueue_email', ...)` to push the rendered email into the `auth_emails` pgmq queue. That RPC, the queue, the `email_send_log` table, and the `process-email-queue` cron job **don't exist yet**, so every send fails silently and Supabase surfaces a generic "User needs authorization code" error to the client.

The "Finish Lovable Emails setup" button in the Cloud panel can't run the provisioning by itself — it requires a backend tool call from me. That's why clicking it shows "confirmed" but nothing changes downstream.

## Fix (one step)

Run the managed email-infrastructure provisioner against the BARBER-HUB Supabase project. This is idempotent and creates everything the `auth-email-hook` already expects:

1. **pgmq extension** + two priority queues: `auth_emails` (high-priority) and `transactional_emails`
2. **RPC wrappers** (SECURITY DEFINER): `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`
3. **Tables**: `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens` — all with RLS
4. **Vault secret**: `email_queue_service_role_key` (used by cron to authenticate to the dispatcher)
5. **Edge Function**: `process-email-queue` (drains the queues, handles retries / 429 backoff / DLQ)
6. **pg_cron job**: `process-email-queue` running every 5 seconds

After provisioning, I'll redeploy `auth-email-hook` to make sure it picks up the now-existing RPC, then verify by checking that `cron.job` contains `process-email-queue` and the `auth_emails` queue exists.

## What you'll see after

- Trigger any auth email (password reset is the easiest test) → the email lands in the inbox from `BarberHub.tv <noreply@barberhub.tv>` within ~5–10 seconds, using your branded Deep Black + Neon Orange templates already in `supabase/functions/_shared/email-templates/`.
- The "User needs authorization code" error stops appearing.
- You can monitor every send in **Cloud → Emails** (and query `email_send_log` directly for status: `pending` → `sent`, or `dlq` if anything fails).

## What I will NOT touch

- The `auth-email-hook` code itself — it's already correct.
- The 6 branded email templates in `_shared/email-templates/` — already styled to your spec.
- Any other Edge Function, table, or RLS policy in the project.
- Resend, RESEND_API_KEY, or any third-party email config — none exist and none are needed.

## Throughput defaults

- 120 emails/min (batch 10, 200ms delay, cron every 5s) — far above what auth + booking + battle notifications need.
- Auth emails get priority over transactional. OTP TTL = 15 min so stale codes never send.
- Tunable later via a one-row update to `email_send_state` — no redeploy needed.
