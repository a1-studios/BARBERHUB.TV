# BarberHub — Branded Auth Email Templates (SMTP-direct path)

These HTML files are designed to be pasted directly into the **Supabase Dashboard → Authentication → Email Templates** editor. They render in the high-octane "Cyber-Industrial" BarberHub aesthetic and ship via the Supabase → Resend SMTP bridge that's already configured for `barberhub.tv`.

## Why HTML (and not the React/TSX templates under `_shared/email-templates/`)

There are two possible delivery paths for auth emails on this project:

1. **ACTIVE — Supabase Auth SMTP → Resend** *(what you're using)*
   Supabase renders the HTML templates configured in the dashboard, substitutes Go template variables (`{{ .ConfirmationURL }}`, `{{ .Token }}`, etc.), and hands the message to Resend over SMTP. No Edge Function involved.

2. **PARKED — Lovable Emails / `auth-email-hook` Edge Function**
   Would render React Email templates and enqueue them via `pgmq`. Requires queue infrastructure (queues, RPCs, cron, dispatcher function) that is **not** provisioned in this Supabase project. The function file is intentionally marked INACTIVE in `supabase/functions/auth-email-hook/index.ts`. **Do not re-enable Lovable Emails** — it would route through that missing infra and break delivery.

Since path #1 is active, we need raw HTML templates with Go template variables — not TSX. That's what lives in this folder.

## Where to paste each template

Open: **Supabase Dashboard → Authentication → Email Templates**

| File                       | Supabase template tab        | Subject line                              |
|----------------------------|------------------------------|-------------------------------------------|
| `confirm-signup.html`      | Confirm signup               | `Confirm your BarberHub account`          |
| `magic-link.html`          | Magic Link                   | `Your BarberHub login link`               |
| `recovery.html`            | Reset Password               | `Reset your BarberHub password`           |
| `invite.html`              | Invite user                  | `You're invited to BarberHub`             |
| `email-change.html`        | Change Email Address         | `Confirm your new BarberHub email`        |
| `reauthentication.html`    | Reauthentication             | `Your BarberHub verification code`        |

For each: paste the full HTML into the **Message body** field, paste the matching subject into the **Subject** field, hit **Save**. Repeat for all six.

## Go template variables — DO NOT modify

Supabase substitutes these at send time. They must remain exactly as written:

- `{{ .ConfirmationURL }}` — the action link (verify, reset, etc.)
- `{{ .Token }}` — 6-digit OTP code (when OTP flow is enabled)
- `{{ .SiteURL }}` — your project's site URL
- `{{ .Email }}` — current email (used in email-change)
- `{{ .NewEmail }}` — new email (used in email-change)

If you rename or remove these, Supabase will send a broken email.

## Sender address

The From address is controlled by your SMTP settings in **Supabase → Authentication → SMTP Settings**, not by these templates. It should be:

```
BarberHub <noreply@barberhub.tv>
```

## Testing

After pasting all six and saving:

1. Trigger a fresh signup with a real inbox you control.
2. The email should arrive within ~10 seconds from `noreply@barberhub.tv`.
3. Check Resend dashboard → Logs to confirm the send was accepted.
4. Click the verify button → should land on your app and confirm the user.

If the email lands in spam, verify SPF/DKIM/DMARC are green in the Resend dashboard.

## Aesthetic notes

- Body background is white (#ffffff) — required for deliverability and to avoid dark-mode rendering issues across email clients.
- Inner content card is dark (#0a0a0a) with neon orange (#FF5F1F) accents.
- All styles are inlined (no `<style>` blocks, no external CSS) for maximum email client compatibility.
- System font stack only — no web fonts (most clients strip them anyway).
- Sharp 4px corners, heavy uppercase letterspacing on headings to match the "industrial / arena" tone.
