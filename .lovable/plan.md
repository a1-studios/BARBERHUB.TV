## Context

You've configured Supabase Auth → Resend via SMTP directly (verified `barberhub.tv` in Cloudflare, added Resend SMTP creds in Supabase Auth settings). This is a **different delivery path** than the previously-attempted Lovable Emails queue path.

Key implication: with SMTP-direct, Supabase renders the email HTML itself using the templates configured in **Supabase Dashboard → Authentication → Email Templates** (using Go template variables like `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`). The `auth-email-hook` Edge Function is **not in the path** and should stay parked. Re-enabling Lovable Emails would re-route through the missing queue infra and break delivery again.

So "activating the branded path" here means: produce branded HTML templates in the Cyber-Industrial aesthetic, with Supabase's Go variables preserved, ready to paste into the Supabase Auth template editor.

## Plan

### 1. Generate branded HTML templates (Cyber-Industrial aesthetic)

Create a new folder `supabase/auth-email-templates/` containing standalone HTML files (not React/TSX — Supabase's editor takes raw HTML with Go template variables). Files:

- `confirm-signup.html` — uses `{{ .ConfirmationURL }}`
- `magic-link.html` — uses `{{ .ConfirmationURL }}`
- `recovery.html` — uses `{{ .ConfirmationURL }}` (password reset)
- `invite.html` — uses `{{ .ConfirmationURL }}`
- `email-change.html` — uses `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`
- `reauthentication.html` — uses `{{ .Token }}` (6-digit code)

**Aesthetic spec ("Cyber-Industrial / High-Octane Barber Hub"):**
- White body background (deliverability requirement) with dark `#0a0a0a` content card
- Neon orange (`#FF5F1F`) accent borders, dividers, and CTA buttons
- Bold uppercase brand mark "BARBER**HUB**" with orange split
- Sharp geometric corners (4px radius), heavy letterspacing on headings
- Mobile-first single-column layout, max-width 560px
- Inline styles only (email client compat)
- System font stack, monospace for OTP codes
- Footer with `barberhub.tv` link + unsubscribe-style copy block

### 2. Add a README in that folder

`supabase/auth-email-templates/README.md` explaining:
- Why these are HTML (SMTP-direct path, not the parked Edge Function path)
- Where to paste each one (Supabase Dashboard → Authentication → Email Templates → [Confirm signup / Magic Link / etc.])
- The subject line to set for each template
- That `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}` are Supabase Go variables and must NOT be changed
- That the `auth-email-hook` Edge Function stays parked/unused on this path

### 3. Keep the parked Edge Function as-is

Do **not** re-enable Lovable Emails. Do **not** modify `auth-email-hook/index.ts`. Its INACTIVE header stays correct — that path requires queue infra you don't have. The SMTP-direct path you just built is independent and simpler.

### 4. Update `.lovable/plan.md`

Replace the "needs queue infra" recovery plan with the new state of the world:
- Active path = Supabase Auth SMTP → Resend (branded via dashboard templates)
- Parked path = Lovable Emails / `auth-email-hook` (requires queue infra, not pursued)
- Where the branded HTML lives in the repo

## What you'll do after I finish

1. Open Supabase Dashboard → Authentication → Email Templates
2. For each template (Confirm signup, Magic Link, Reset Password, Invite, Change Email Address, Reauthentication): paste the matching HTML from `supabase/auth-email-templates/` into the message body, set the subject line per the README
3. Save
4. Trigger a test signup → branded email arrives from `noreply@barberhub.tv` via Resend

## What I will NOT do

- Will not re-enable Lovable Emails toggle (would break delivery)
- Will not modify or redeploy `auth-email-hook` (parked, not in delivery path)
- Will not run any DB migrations (SMTP path needs no DB infra)
- Will not touch SMTP creds or Resend config (you own that)

## Risks / things to confirm

- **Subject lines**: Supabase keeps these separate from body HTML — README will give you exact strings to paste for each template
- **`{{ .Token }}` vs `{{ .ConfirmationURL }}`**: Both work depending on your Supabase Auth flow setting. Confirm-signup template will include both a button (URL) and a code (Token) block, so it works under either flow without further edits
- **Deliverability**: Resend free tier is fine for testing; verify SPF/DKIM are green in Cloudflare/Resend dashboards before high volume
