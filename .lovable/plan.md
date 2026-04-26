## Status
Branded email path is **DEACTIVATED**. Default Supabase mailer is the active route — confirmation emails are delivering again.

## Why branded email failed
The `auth-email-hook` was deployed and Auth was routed through it, but the queue/logging backend it depends on does NOT exist in the connected Supabase project. Specifically missing:

- `pgmq` extension + `auth_emails` / `transactional_emails` queues
- RPC wrappers: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`
- Tables: `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`
- Vault secret: `email_queue_service_role_key`
- `process-email-queue` Edge Function + `pg_cron` job (every 5s)

When Auth invoked the hook, the `enqueue_email` RPC call failed (or messages landed in a queue with no dispatcher), so no email was ever sent. Meanwhile the default mailer was bypassed because Lovable Emails was toggled on.

## What was done in this rollback
1. Disabled Lovable Emails for the project → auth emails now go through the default Supabase mailer (confirmed working in logs).
2. Added an "INACTIVE" header to `supabase/functions/auth-email-hook/index.ts` so it isn't re-enabled blindly.
3. Preserved all branded templates under `supabase/functions/_shared/email-templates/` — branding work is intact.
4. DNS for `notify.barberhub.tv` left verified — no DNS rework needed for re-activation.

## Prerequisites before re-activating branded email
ALL of the following must exist in the connected Supabase project:

- [ ] `pgmq` extension installed
- [ ] `auth_emails` and `transactional_emails` pgmq queues
- [ ] RPCs: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` (SECURITY DEFINER, granted to service_role)
- [ ] Tables: `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens` (with RLS)
- [ ] Vault secret: `email_queue_service_role_key`
- [ ] `process-email-queue` Edge Function deployed
- [ ] `pg_cron` job scheduled to invoke `process-email-queue` every 5s
- [x] DNS verified for `notify.barberhub.tv`

These cannot be hand-written as a SQL migration — they must be provisioned through the managed email infrastructure setup so vault secrets, cron auth, and pgmq grants are wired correctly.

## Re-activation sequence (separate approved turn)
1. Run managed email infrastructure setup → provisions everything above.
2. Re-enable Lovable Emails (toggle on).
3. Redeploy `auth-email-hook`.
4. Trigger a fresh signup. Verify:
   - `email_send_log` has a row with `status = 'sent'`
   - Email arrives from `noreply@notify.barberhub.tv` (not `mail.app.supabase.io`)
   - Confirmation link returns the user to `https://barberhub.tv` and signs them in.

## Success criteria for the current rollback
- [x] Lovable Emails disabled
- [x] `auth-email-hook` marked inactive in code
- [x] Branded templates preserved
- [ ] Next signup receives confirmation email from default sender (user to confirm)
