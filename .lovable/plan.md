# Branded Email Audit — Root Cause Found

## TL;DR

The branded email pipeline is broken because the **database email infrastructure was never provisioned**. Your `auth-email-hook` edge function correctly tries to enqueue emails by calling the `enqueue_email` RPC — but that RPC, the pgmq queues, the `email_send_log` table, and the cron dispatcher **do not exist** in your Supabase project. So every password-reset / signup email fails silently at the enqueue step. That's exactly why you see "Error sending recovery email" in the screenshot.

---

## Audit Results

### ✅ What IS configured correctly

| Component | Status |
|---|---|
| Email domain `notify.barberhub.tv` | **Verified** (DNS active, NS delegated to ns3/ns4.lovable.cloud) |
| Auth email templates (`signup`, `recovery`, `magic-link`, `invite`, `email-change`, `reauthentication`) | Present in `supabase/functions/_shared/email-templates/` with BarberHub branding |
| `auth-email-hook` edge function | Deployed, uses correct queue-based pattern (calls `supabase.rpc('enqueue_email', ...)`) |
| `LOVABLE_API_KEY` secret | Provisioned (managed) |
| `pgmq` Postgres extension | Installed |

### ❌ What is BROKEN (root cause)

Database query confirms the email infrastructure is missing:

```
pgmq_ext:        true   ← extension installed
enqueue_fn:      false  ← RPC missing  ⛔
log_tbl:         false  ← email_send_log missing  ⛔
state_tbl:       false  ← email_send_state missing  ⛔
suppressed_tbl:  false  ← suppressed_emails missing  ⛔
cron_job:        false  ← process-email-queue cron missing  ⛔
```

**Effect:** When a user clicks "Send Reset Link", Supabase Auth fires the webhook → `auth-email-hook` runs → tries `supabase.rpc('enqueue_email', ...)` → Postgres returns "function does not exist" → hook returns 500 → user sees `Error sending recovery email`.

### ➖ Not relevant to branded auth emails

- No `RESEND_API_KEY` / `SEND_EMAIL_HOOK_SECRET` — correct, Lovable Emails is managed and uses `LOVABLE_API_KEY` automatically. Do not add these.
- Stripe / Twilio / Gemini / YouTube secrets — unrelated to email pipeline.

---

## Fix Plan (3 steps, single run)

1. **Provision email infrastructure** via the managed setup tool. This creates (idempotently): `pgmq` queues `auth_emails` + `transactional_emails`, RPC wrappers (`enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`), tables (`email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`) with RLS, the `process-email-queue` cron job (every 5s), and the Vault secret for the cron dispatcher.

2. **Redeploy `auth-email-hook`** so it picks up the now-existing RPC at runtime (no code change needed — it's already on the queue-based pattern).

3. **Verify** by:
   - Querying `cron.job` to confirm `process-email-queue` is scheduled.
   - Triggering a password reset on `alaguileracorp@gmail.com` from the live UI.
   - Checking `email_send_log` for a row with `template_name='auth_emails'` transitioning `pending → sent`.

## What you'll see after the fix

- Password reset, signup confirmation, magic link, and email-change emails will arrive within seconds, branded with the BarberHub deep-black + neon orange template, sent from `notify.barberhub.tv`.
- All sends logged in `email_send_log` (deduplicate by `message_id` for accurate counts).
- Failures auto-retry up to 5 times via the cron dispatcher; permanent failures land in DLQ.

## Out of scope (not touching)

- Templates themselves (already branded correctly).
- Domain / DNS (already verified).
- Transactional (app) emails — separate system; happy to scaffold after auth is confirmed working if you want booking confirmations, contact-form acks, etc.
