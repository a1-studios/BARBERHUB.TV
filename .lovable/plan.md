## Goals
Holistic update: web diagnostics, Dual-Channel (Email + SMS via Twilio) OTP signup additive to existing auth, and legal compliance for Twilio/Stripe approval. Legacy `AuthDialog` (password sign-in) stays untouched.

## Phase 1 — Diagnostic Sanitization

### 1.1 Duplicate `</body>` in `index.html`
`index.html` currently ends with `</body></body></html>`. Remove the duplicate closing `</body>` tag — keeps iOS WebView parsers happy.

### 1.2 Canonical URL → `https://barberhub.tv`
- `index.html`: change `<link rel="canonical" href="https://barberhub-tv.lovable.app/">` → `https://barberhub.tv/`. Also update `og:url`.
- Audit and update any hardcoded `barberhub-tv.lovable.app` strings in app/page-level `<Helmet>` blocks (e.g. `VelvetRopeLanding.tsx`, legal pages, SEO helpers in `src/lib/` and `docs/seo/`) — replace with `https://barberhub.tv`.
- Leave `vite.config.ts` / `.env` / Supabase project URL untouched.

### 1.3 Bundle audit (conservative)
- Run `bun run build` and read the Vite chunk report.
- Strip only confirmed-unused deps (typical candidates to verify: any leftover map/chart libs not referenced via `rg`). Anything ambiguous is left alone per instructions.
- No dynamic-import refactors in this pass — just dead-weight removal.

## Phase 2 — Safe Auth Expansion (Additive Only)

### 2.1 Preserve legacy
`src/components/auth/AuthDialog.tsx` and `src/hooks/useAuth.ts` `signIn(email, password)` path remain unchanged. No callers of `AuthDialog` are removed.

### 2.2 Twilio connector
- Link the **Twilio** connector via `standard_connectors--connect` (gateway-enabled; sets `TWILIO_API_KEY` + uses `LOVABLE_API_KEY`).
- Recommend the user enable Twilio's **SMS Pumping Protection** and tighten **Geo Permissions** to launch countries.

### 2.3 New Edge Function: `send-sms-otp`
Replaces Supabase's built-in SMS provider so we don't have to wire Twilio into Supabase Auth itself.

- Input: `{ phone: E.164 }`. Validates with Zod.
- Generates a 6-digit code, hashes it, stores in a new `phone_otp_codes` table with `expires_at = now() + 5 min`, `attempts = 0`, single active row per phone.
- Sends SMS through Twilio gateway (`POST https://connector-gateway.lovable.dev/twilio/Messages.json`, form-encoded) with body: *"Your Barber-Hub code is {code}. Reply STOP to opt out, HELP for help. Msg&data rates may apply."*
- Rate-limit: max 1 send / 60s / phone, 5 / hour / phone, in-memory + DB-backed.

### 2.4 New Edge Function: `verify-sms-otp`
- Input: `{ phone, code }`.
- Validates hash, `attempts < 5`, not expired.
- On success: looks up or creates a Supabase auth user via Admin API using a deterministic synthetic email `phone+<digits>@sms.barberhub.tv` (since the project rule for Mandatory Country/Email collection still applies; the user will be prompted to add a real email in the post-signup ceremony — same flow barbers already go through).
- Returns a one-time `action_link` (via `generateLink({ type: 'magiclink' })`) that the client exchanges for a session — or, simpler, returns a short-lived custom JWT signed with service role and the client calls `setSession`.
- Honors `global_vip_mode` via the same `validate_access_code` RPC the email path uses; the SMS path takes the same VIP-code gate step.

### 2.5 `AuthModalV2` smart-detect input
- Replace the dedicated email input on the Identity step with a single field.
- Detection (client-side):
  - `EMAIL_RE = /^\S+@\S+\.\S+$/` → email branch.
  - Otherwise strip non-digits; if `>= 8` digits, normalize to E.164 using `libphonenumber-js` (already small, ~70KB; add as new dep) with a default-country picker (defaults to `US`, overridable by a small country-code dropdown next to the input).
  - Neither → inline validation error.
- Branches:
  - Email → existing `supabase.auth.signInWithOtp({ email })` flow (unchanged).
  - Phone → `supabase.functions.invoke('send-sms-otp', { body: { phone }})`, then verify step calls `verify-sms-otp` instead of `verifyOtp`.
- OTP verify UI is shared (6-digit `InputOTP`). Resend respects channel.
- Keeps VIP-code gate, role pick, and post-verify role/profile writes as-is.

### 2.6 Targeted "Sign Up" CTA redirection
- `src/pages/CreatorHub.tsx` and `src/components/creator/CreatorHub.tsx`: the **"Sign Up" / "Join Creator Hub" CTA** opens a new `<AuthModalV2 mode="signup" />`. The existing `<AuthDialog>` wrapper is left in place for the password "Login" flow.
- Audit other explicit signup CTAs with `rg "Sign up|Create account|Join"` and route only those to `AuthModalV2`. Standard "Login" / "Sign in" triggers stay on `AuthDialog`.

## Phase 3 — Legal Framework Injection (additive)

For each file, prepend a new `<Section>` without touching existing boilerplate.

### 3.1 `src/pages/legal/Privacy.tsx`
Insert a new section after the current "Data Collected" section: **"SMS Consent and Phone Numbers"** with the verbatim copy from the brief.

### 3.2 `src/pages/legal/Terms.tsx`
Insert two new top-level sections:
- **"Mobile Messaging (SMS)"** — verbatim opt-in/STOP/HELP language.
- **"Virtual Currency (Barber Bucks)"** — non-transferable utility, no cash value off-platform, Stripe-mediated fiat payouts, 18+/KYC gated.

### 3.3 `src/pages/legal/DMCA.tsx`
Change the "Designated Copyright Agent" block to:
```
A1Studios Film LLC — Copyright Agent
175 East Shore Road, Great Neck, NY
Email: dmca@barberhub.tv
```

### 3.4 `src/pages/legal/AUP.tsx`
Add an explicit clause under "Live Streaming Rules" (or a new "Copyrighted Material" sub-section): zero tolerance for broadcasting unauthorized copyrighted music, films, TV, or other IP during live streams; immediate stream termination + DMCA strike.

## Database changes (Phase 2 only)

One migration:

```sql
CREATE TABLE public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.phone_otp_codes TO service_role;
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;
-- no anon/authenticated policies: edge functions use service role only
```

No changes to `access_codes` schema or RPCs.

## Memory update
Update `mem://index.md` Core rules: remove **Twilio** from the "permanently forbidden" list and add a new memory `mem://integrations/twilio-sms-otp` documenting the new SMS OTP path, the `phone_otp_codes` table, and the two edge functions. `mem://features/feature-removals` also gets a note that Twilio was re-enabled specifically for auth OTP.

## Files touched

**Edited**
- `index.html` (duplicate body, canonical, og:url)
- `src/components/landing/VelvetRopeLanding.tsx` (canonical Helmet)
- `src/components/auth/AuthModalV2.tsx` (smart-detect input, SMS branch)
- `src/pages/CreatorHub.tsx`, `src/components/creator/CreatorHub.tsx` (Sign-Up CTA → AuthModalV2)
- `src/pages/legal/Privacy.tsx`, `Terms.tsx`, `DMCA.tsx`, `AUP.tsx`
- `mem://index.md`

**Created**
- `supabase/functions/send-sms-otp/index.ts`
- `supabase/functions/verify-sms-otp/index.ts`
- Migration for `phone_otp_codes`
- `mem://integrations/twilio-sms-otp`

**Untouched**
- `src/components/auth/AuthDialog.tsx`, `src/hooks/useAuth.tsx` password path
- `access_codes` table and RPCs
- All BB economy / Stripe edge functions

## Out of scope
- Local `vitest` / `playwright` env fixes.
- iOS Capacitor conversion (this PR only sanitizes for it).
- Replacing Supabase Auth's built-in SMS — we side-channel via our own edge functions to avoid touching Auth provider config.
