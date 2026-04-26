## Goal
Stop the broken branded email path immediately so signup confirmations resume via the default Supabase mailer, then document exactly what must be in place before we re-activate branding.

## Why branded email is failing right now
The `auth-email-hook` was deployed and activated, but the queue/logging backend it depends on is not present in the connected Supabase project:

- `auth-email-hook` enqueues to a pgmq queue (`auth_emails`) via the `enqueue_email` RPC and writes audit rows to `email_send_log`.
- The connected database does not have `enqueue_email`, `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`, or the `process-email-queue` cron job set up.
- Result: when Auth calls the hook, the enqueue fails (or succeeds into a queue with no dispatcher), so no email is ever sent.
- Recent auth logs confirm this — the only emails going out are still from `noreply@mail.app.supabase.io` (the default mailer), not from `notify.barberhub.tv`. When the hook is the active route, nothing arrives at all.

## Plan

1. **Deactivate branded email (revert to default mailer)**
   - Toggle Lovable Emails off for the project. This reverts auth emails to the default Supabase/Lovable templates, which we already confirmed are being delivered.
   - No code changes required for this step — the toggle alone restores the working path.
   - Confirmation emails will go out from the default sender again immediately.

2. **Quarantine the broken hook so it can't be re-enabled accidentally**
   - Leave the `auth-email-hook` function and templates in place (no deletion) so we don't lose branding work.
   - Add a clear top-of-file comment noting it is inactive pending email infrastructure setup.

3. **Document the prerequisites that must exist before re-activating branded email**
   The branded path needs the full Lovable Emails infrastructure provisioned in this Supabase project:
   - `pgmq` extension + `auth_emails` and `transactional_emails` queues
   - RPC wrappers: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`
   - Tables: `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens` (with RLS)
   - Vault secret: `email_queue_service_role_key`
   - `process-email-queue` Edge Function deployed
   - `pg_cron` job calling `process-email-queue` every 5s
   - DNS for `notify.barberhub.tv` already verified (already done)

4. **Re-activation path (for a later turn, not now)**
   - Run the managed email infrastructure setup so all of step 3 is provisioned in one shot.
   - Re-enable Lovable Emails (toggle on).
   - Redeploy `auth-email-hook` so it picks up the now-present `enqueue_email` RPC.
   - Trigger a fresh signup and verify a row lands in `email_send_log` with status `sent` and the email arrives from `noreply@notify.barberhub.tv`.

## What I will change in this turn
- Disable Lovable Emails for the project (auth emails revert to default mailer, delivery resumes).
- Add an "INACTIVE" header comment to `supabase/functions/auth-email-hook/index.ts` so future work knows it's parked.
- Update `.lovable/plan.md` to reflect the rollback and the prerequisites needed before re-enabling.

## What I will NOT change
- No template files will be deleted — branding work is preserved.
- No DNS changes — `notify.barberhub.tv` stays verified for when we re-enable.
- No database migrations in this turn — provisioning the email infra is the separate next step you approve when you're ready to try branding again.

## Success criteria
- New signups receive the confirmation email (via the default sender) within seconds.
- Auth logs show `mail.send` events again for new signups.
- The branded path is documented as parked, with a clear, ordered checklist of what must be true before we turn it back on.

## Technical details
```text
Now (broken)
  signup -> auth-email-hook -> enqueue_email (missing) -> nothing sent

After this plan (working again)
  signup -> default Supabase mailer -> email delivered

Future re-activation (separate approved turn)
  provision pgmq + tables + RPCs + cron + vault secret
    -> re-enable Lovable Emails
    -> redeploy auth-email-hook
    -> signup -> hook -> enqueue_email -> process-email-queue -> branded email delivered
```
