# Verify Branded Auth Email Delivery

## Current state (confirmed)
- Domain `notify.barberhub.tv` is **verified** ✅
- `auth-email-hook` is deployed with 6 branded templates ✅
- BUT the hook uses the **old direct-send pattern** (imports `@lovable.dev/email-js`) instead of the new queue-based pattern (`enqueue_email` RPC). Old hooks miss retry safety + rate-limit handling but still send branded emails.

## What you do manually (required first)
1. **Disable Custom SMTP** in Supabase → Authentication → Providers → SMTP Settings (toggle OFF, Save)
2. **Delete `onlyfansexpo@gmail.com`** from Supabase → Authentication → Users
3. **Retry signup** in the app

## Expected result
- Email arrives in 5–30 seconds from `noreply@notify.barberhub.tv`
- Branded dark card with neon orange "Activate Account" button
- Subject line: "Confirm your email"

## What I'll do if email still doesn't arrive
Once you confirm the result, I'll either:

**If email arrives but unbranded** → check Supabase auth hook is actually pointed at `auth-email-hook` (Cloud → Emails activation status). If the hook isn't activated server-side, redeploy with `supabase--deploy_edge_functions` to trigger the auto-reconcile.

**If no email arrives at all** → 
1. Pull `auth-email-hook` logs (`supabase--edge_function_logs`) to see if Supabase is even calling the hook
2. Pull `email_send_log` rows for the recipient to see queue status
3. If hook is being called but failing → re-scaffold with the queue-based pattern (`scaffold_auth_email_templates` with `confirm_overwrite: true`) and redeploy. This upgrades the hook to use pgmq for retries while preserving the existing branded templates.
4. If hook is NOT being called → activation is stuck; surface the Cloud → Emails status and guide remediation.

**If email arrives, branded, working** → done. Optionally upgrade to queue-based pattern as a hardening step (better retry behavior under load), but not required.

## What I will NOT do
- Won't touch the templates (they're already branded correctly)
- Won't touch the SMTP/Resend config (you control that in Supabase dashboard)
- Won't switch back to Resend — Lovable Emails is the right path here
