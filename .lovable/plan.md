# Email Delivery — State of the World

## Active path: Supabase Auth SMTP → Resend

- DNS for `barberhub.tv` is verified (NS records in Cloudflare).
- Supabase Auth → SMTP Settings is configured with Resend SMTP credentials.
- From address: `BarberHub <noreply@barberhub.tv>`.
- Branded HTML templates live in `supabase/auth-email-templates/` and must be pasted into **Supabase Dashboard → Authentication → Email Templates** (one per template type). See that folder's README for paste targets and subject lines.
- Supabase substitutes Go template variables (`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`) at send time.

## Parked path: Lovable Emails / `auth-email-hook` Edge Function

- The Edge Function `supabase/functions/auth-email-hook/index.ts` is marked **INACTIVE** at the top of the file.
- "Lovable Emails" toggle is **OFF** for this project.
- This path requires email queue infrastructure that is **not** provisioned: pgmq queues (`auth_emails`, `transactional_emails`), RPCs (`enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`), tables (`email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`), the `process-email-queue` dispatcher function, a pg_cron job, and a Vault secret (`email_queue_service_role_key`).
- The React Email templates under `supabase/functions/_shared/email-templates/` are preserved but unused on the active path.
- **Do not re-enable Lovable Emails** unless you also provision the full queue infrastructure first — doing so would route auth emails through a missing `enqueue_email` RPC and break delivery.

## Why two paths exist

We initially branded emails through the Lovable Emails / queue path, but the queue infra was never provisioned, so emails stalled. To restore delivery quickly, we switched to a direct SMTP → Resend bridge that bypasses the queue entirely. The branded HTML in `supabase/auth-email-templates/` is the production-aligned version of the `_shared/email-templates/` TSX components, written as raw HTML so Supabase can render them itself.

## How to verify delivery

1. Trigger a fresh signup with a real inbox.
2. Email should arrive within ~10s from `noreply@barberhub.tv`.
3. Check Resend dashboard → Logs to confirm the send.
4. Click the verify link → user is confirmed in Supabase Auth.
