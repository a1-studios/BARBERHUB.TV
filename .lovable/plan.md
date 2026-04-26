## What I found
- The signup request is succeeding. Recent auth logs show both `POST /signup` and the follow-up email resend request returning `200`, so the app is successfully asking Supabase to send the confirmation email.
- The app currently shows a success state as soon as signup succeeds, not when inbox delivery is confirmed.
- The project has a verified sender subdomain: `notify.barberhub.tv`.
- The repo still contains notes for an older split setup: custom auth email hook is parked, queue tables are not provisioned, and HTML templates were meant to be pasted into Supabase manually.
- There are no recent auth errors, which points away from a frontend bug and toward email delivery/configuration mismatch.

## Most likely cause
The app is reporting “sent” because Supabase accepted the request, but inbox delivery is happening through an email setup that is not fully aligned. Right now the project appears to have:
1. a verified built-in sender domain (`notify.barberhub.tv`), and
2. legacy instructions/code assuming a separate SMTP/template path.

That mismatch is the strongest candidate for why requests succeed but emails are not arriving.

## Plan
1. Audit the live auth email path in project settings and confirm whether auth emails are currently using built-in project email delivery or legacy SMTP templates.
2. Standardize on a single sending path so signup, magic link, invite, and password reset all use the same verified domain and branded templates.
3. If needed, set up the proper auth email pipeline end-to-end for the verified domain, deploy the required function(s), and verify with a fresh signup test.
4. Update the signup UI copy so it no longer implies inbox delivery is guaranteed the moment the request is accepted.
5. Re-test signup and password recovery, then confirm exactly where the email lands and which sender/from address is being used.

## Technical details
- Evidence from logs: latest auth activity includes successful `POST /signup` and `POST /resend` responses with status `200` for `onlyfansexpo@gmail.com`.
- Database check: the user row exists and remains unconfirmed, meaning account creation happened but confirmation completion did not.
- Repo state: `supabase/functions/auth-email-hook/index.ts` is explicitly marked inactive, and the database does not currently contain the queue tables that hook would need.
- Current app behavior: `src/hooks/useAuth.tsx` shows a success toast immediately after `signUp()` returns a user.

## Result after approval
I’ll inspect the active email configuration, align it to one working setup, update the messaging, and verify the full confirm-signup flow end to end.