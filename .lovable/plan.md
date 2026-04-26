## Goal
Restore reliable account confirmation emails first, then re-enable the branded sender path without leaving the project in a half-configured state.

## Audit findings
- The sender subdomain is verified and available for email sending.
- Recent auth logs still show confirmation mail going out from the default Supabase sender, not the BarberHub sender.
- The custom auth email function has no request logs, which means Auth is not currently routing confirmation emails through it.
- The current function code expects shared email infrastructure in the database (`email_send_log`, `email_send_state`, suppression tables, and the enqueue RPC), but those objects do not exist in the connected database.
- `supabase/config.toml` still uses `https://lovable.app` as the auth site URL, which is not aligned with the app’s real signup flow or resend links.

## Plan
1. **Normalize auth URL configuration**
   - Update the auth configuration to use the project’s real app URL(s) instead of `lovable.app`.
   - Align every signup, resend, and password-reset redirect with the same origin strategy so confirmation links always return users to the correct app.

2. **Replace the hand-maintained auth email hook with a managed-compatible setup**
   - Rebuild the auth email setup from the managed template flow so the hook matches the platform’s current contract.
   - Keep the existing BarberHub branding, copy, and white-background email design.
   - Redeploy the auth email function after the reset.

3. **Repair the missing backend email infrastructure before activating the hook**
   - Restore the shared email pipeline that the hook depends on in the connected Supabase project.
   - Confirm the queue/logging pieces exist before relying on the custom hook.
   - If that infrastructure cannot be restored in this project, switch to the safe fallback path: deliver confirmation emails through the default auth mailer first, then reintroduce branded delivery only after the backend is complete.

4. **Harden the frontend signup flow**
   - Make the landing/signup flow consistently surface the user’s next step after signup: sent, resend pending, resend success, and spam-folder guidance.
   - Ensure both signup entry points in the app use the same redirect target and confirmation messaging.

5. **Run an end-to-end verification pass**
   - Trigger a fresh signup and a resend.
   - Verify the auth system stops using the default sender for new confirmation emails once the custom path is active.
   - Confirm the email function receives traffic, the send pipeline records success/failure, and the confirmation link signs the user in and allows prize claiming.

## What I will change
- `supabase/config.toml`
- `supabase/functions/auth-email-hook/index.ts`
- Auth email templates under `supabase/functions/_shared/email-templates/`
- Signup/resend client code where redirects or messaging are inconsistent
- Optional: add a targeted edge-function test for the auth email hook

## Success criteria
- New signups generate a confirmation email that is actually received.
- The sender/path used is intentional and observable in logs.
- No missing-table or missing-RPC failures remain in the auth email pipeline.
- Confirmation links return users to the correct app URL.
- Prize-claim signup flow works after email confirmation.

## Technical details
```text
Current state
Auth signup -> default Supabase mailer sends confirmation
           -> custom auth-email-hook not invoked

Current custom hook risk
custom hook -> tries to write email_send_log / enqueue_email
            -> database objects are missing
            -> would fail if activated as-is

Target state
Auth signup -> auth-email-hook invoked
           -> working email backend path
           -> message delivered
           -> user confirms -> returns to correct URL -> prize claim continues
```

## Notes
This plan intentionally fixes delivery reliability before branding. Right now the project has verified DNS, inactive custom routing, and missing backend email objects; activating the current hook without repairing that stack would likely turn “not receiving emails” into hard failures.