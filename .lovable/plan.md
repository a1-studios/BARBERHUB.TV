

## Meta CAPI Bridge + barberhub.tv Coming Soon Wizard

Two deliverables: (1) verify/wire the `meta-capi-track` Edge Function with the new secrets so Nationality + UserType flow through Meta correctly, (2) ship a public-facing "Coming Soon" page at `barberhub.tv` with a multi-step wizard that captures email → role → country → spin-to-win, then fires `Lead` and `CompleteRegistration` to Meta.

## Part 1 — Meta Pixel + CAPI (frontend + server)

### 1.1 Pixel base install
- `index.html`: insert Meta Pixel base code in `<head>` (Pixel ID `3952840548352887`, initial `PageView`).
- `<noscript>` `<img>` fallback in `<body>` (HTML5 spec — never in `<head>`).

### 1.2 SPA route tracking
- New `src/lib/metaPixel.ts`: typed wrapper (`fbqTrack`, `fbqTrackPageView`, `getFbp`, `getFbc`) that guards `typeof window.fbq === 'function'`.
- New `src/hooks/useMetaPixelPageView.tsx`: listens to React Router `useLocation()` and fires `PageView` per pathname change.
- Mount the hook inside `AppContent` in `src/App.tsx`.
- `src/vite-env.d.ts`: add `Window.fbq` global type.

### 1.3 Edge Function `meta-capi-track`
**Inputs (from client):**
```ts
{
  event_name: 'Lead' | 'CompleteRegistration',
  event_id: string,                 // UUID for browser+server dedup
  email?: string,
  country?: string,                 // ISO-2 (US, CA, ...)
  user_type?: 'fan' | 'barber',
  source_url?: string,
  fbp?: string,                     // _fbp cookie
  fbc?: string                      // _fbc cookie (from fbclid)
}
```

**Field mapping → Meta CAPI payload:**
| Intake field | Meta CAPI location | Notes |
|---|---|---|
| `email` | `user_data.em[0]` | SHA-256 hashed, lowercased+trimmed |
| `country` | `user_data.country[0]` | SHA-256 hashed, lowercased ISO-2 |
| `user_type` | `custom_data.user_role` | `'barber'` or `'fan'` — drives audience splits |
| `country` | also `custom_data.country` (clear) | Lets Meta build per-country lookalikes |
| `event_id` | top-level `event_id` | dedupes against pixel event |
| `fbp` / `fbc` | `user_data.fbp` / `user_data.fbc` | Click attribution |
| `source_url` | `event_source_url` | Required by Meta |

**Behavior:**
- Reads `META_ACCESS_TOKEN` and `barberhub_meta_data` (= dataset ID `3952840548352887`) from secrets.
- POSTs to `https://graph.facebook.com/v19.0/{barberhub_meta_data}/events` with `data: [event]` + `access_token`.
- Returns `{ success: true, events_received }` non-blocking from client perspective.
- Public function (`verify_jwt = false` in `supabase/config.toml`) — needs to fire pre-signup.
- CORS headers on every response.
- Zod validation on body; returns 400 with field errors on bad input.

### 1.4 Conversion fire points (existing flows)
| Event | Where it fires | Params |
|---|---|---|
| `Lead` | `EmailGateStep` after email captured | `email`, `country` (if known from URL), `user_type` (if pre-selected) |
| `CompleteRegistration` (fan) | `FinalizeStep` after `supabase.auth.signUp` resolves | `email`, `country`, `user_type: 'fan'` |
| `CompleteRegistration` (barber) | `BarberProfileForm` after profile upsert | `email`, `country_code`, `user_type: 'barber'` |

Each call: generate UUID `event_id` → fire `fbq('track', name, params, { eventID })` → POST same `event_id` to `meta-capi-track` for server dedup.

### 1.5 Nationality auto-fill from URL (`?country=US`)
- New `src/lib/urlParams.ts`: `getCountryFromUrl()` reads `?country=` or `?nationality=`, validates against ISO-2 list, persists to `sessionStorage.intake_country`.
- Consumed by: `FinalizeStep`, `BarberProfileForm`, and the new Coming Soon wizard.
- Also passed into every `fbq` and CAPI call so Meta attributes geo correctly.

## Part 2 — barberhub.tv Coming Soon Wizard

### 2.1 Route + visibility
- New `src/pages/ComingSoon.tsx` mounted at `/coming-soon`.
- New `src/config/launchMode.ts` exporting `LAUNCH_MODE = 'coming_soon' | 'live'` (env-driven via `VITE_LAUNCH_MODE`, default `'live'`).
- `src/App.tsx`: when `LAUNCH_MODE === 'coming_soon'`, the `/` route renders `ComingSoon` instead of `Index`. All other routes still work for internal QA.
- Custom domain `barberhub.tv`: user flips `VITE_LAUNCH_MODE=coming_soon` to publish the gate; flip back when ready.

### 2.2 Hero
- Full-bleed dark background, animated faction banner accent, gold→orange gradient logo lockup ("BARBERHUB.TV").
- Tagline: "THE GLOBAL BARBER ARENA — LAUNCHING SOON".
- Live counter pill: total signups so far (reads from `marketing_leads` count via lightweight RPC or supabase select).
- Single CTA: **"Claim Your Spot"** → opens wizard.

### 2.3 Multi-step wizard (`src/components/coming-soon/LaunchWizard.tsx`)

5 steps, brand-consistent (14px rounding, neon orange, white labels):

| # | Step | Captures | Meta event |
|---|---|---|---|
| 1 | **Email** | email (zod-validated) | `Lead` (pixel + CAPI, `event_id` A) |
| 2 | **Role** | `barber` or `fan` (two big rounded cards) | — (stored in state) |
| 3 | **Country** | ISO-2 via existing `CountrySelector`, pre-filled from `?country=` | — |
| 4 | **Spin-to-Win** | Reuses `VaultSpinWheel` — guests get one free spin; result stored in `localStorage.pending_spin_prize` keyed to email | — |
| 5 | **Reveal** | Shows prize + "We'll email you when the doors open." Insert into `marketing_leads` (email, role, country, prize_label, fbp, fbc). | `CompleteRegistration` (pixel + CAPI, `event_id` B, `user_role` = step 2 choice) |

- Back/Skip buttons on every step (Skip closes wizard, keeps email already saved as `Lead`).
- Progress dots at top (1/5 … 5/5).
- All inputs: `rounded-[14px] border-orange-500/40 bg-background/60 h-11`.
- Primary CTA per step: orange gradient, full-width, 14px.

### 2.4 `marketing_leads` table
Migration adds (if not present) or extends:
```sql
create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_role text check (user_role in ('barber','fan')),
  country_code text,
  prize_label text,
  prize_bb integer default 0,
  fbp text, fbc text,
  source_url text,
  utm_source text, utm_medium text, utm_campaign text,
  converted boolean default false,
  created_at timestamptz default now()
);
alter table public.marketing_leads enable row level security;
-- Public can insert their own lead; only service role can read.
create policy "anon_insert_lead" on public.marketing_leads for insert to anon, authenticated with check (true);
```
Already-existing `mark_marketing_lead_converted(email)` RPC stays — fired from `Auth.tsx`/`Index.tsx` after signup so the lead is flagged converted.

### 2.5 UTM + fbclid capture
Wizard reads `utm_source`, `utm_medium`, `utm_campaign`, `fbclid` from URL on mount, persists in `sessionStorage`, attaches to both the lead row and the CAPI payload (`fbclid` → `fbc` cookie format).

## Files Touched

| File | Change |
|---|---|
| `index.html` | Pixel base in `<head>`, `<noscript>` fallback in `<body>` |
| `src/lib/metaPixel.ts` | **NEW** — typed wrapper + cookie helpers |
| `src/lib/urlParams.ts` | **NEW** — country + UTM + fbclid helpers |
| `src/hooks/useMetaPixelPageView.tsx` | **NEW** — SPA PageView |
| `src/vite-env.d.ts` | `window.fbq` global + `VITE_LAUNCH_MODE` |
| `src/App.tsx` | Mount PageView hook; conditional `/` route based on `LAUNCH_MODE` |
| `src/config/launchMode.ts` | **NEW** — coming-soon flag |
| `src/pages/ComingSoon.tsx` | **NEW** — landing hero + wizard mount |
| `src/components/coming-soon/LaunchWizard.tsx` | **NEW** — 5-step orchestrator |
| `src/components/coming-soon/StepEmail.tsx` | **NEW** |
| `src/components/coming-soon/StepRole.tsx` | **NEW** |
| `src/components/coming-soon/StepCountry.tsx` | **NEW** |
| `src/components/coming-soon/StepSpin.tsx` | **NEW** — wraps `VaultSpinWheel` |
| `src/components/coming-soon/StepReveal.tsx` | **NEW** — fires `CompleteRegistration`, inserts lead |
| `src/components/promotion-gate/EmailGateStep.tsx` | Fire `Lead` (pixel + CAPI) on email capture |
| `src/components/promotion-gate/FinalizeStep.tsx` | Pre-fill country from URL; fire fan `CompleteRegistration` |
| `src/components/profiles/BarberProfileForm.tsx` | Pre-fill country from URL; fire barber `CompleteRegistration` |
| `supabase/functions/meta-capi-track/index.ts` | **NEW** — server-side mirror, hashes email/country, maps `user_type` → `custom_data.user_role` |
| `supabase/config.toml` | Register `meta-capi-track` with `verify_jwt = false` |
| `supabase/migrations/<ts>_marketing_leads.sql` | Create/extend `marketing_leads` table + RLS |

## Secrets (already added by you)
- `META_ACCESS_TOKEN` ✅
- `barberhub_meta_data` ✅ (= dataset ID `3952840548352887`)

The Edge Function will read both via `Deno.env.get(...)`. Pixel ID stays public in `index.html` (standard practice).

## Result
- `barberhub.tv` shows a Coming Soon hero with a 5-step claim wizard. Each visitor's email → role → country → spin prize is captured to `marketing_leads`, fully attributed to the originating Meta ad via `fbp`/`fbc`/UTMs, and mirrored server-side through the Conversions API.
- `Lead` fires when email is captured (top of funnel), `CompleteRegistration` fires when the wizard completes (full intake) — both with `user_role: barber|fan` and hashed `country` so Meta can build separate barber-LAL and fan-LAL audiences per country.
- When you flip `VITE_LAUNCH_MODE=live`, the same wizard infrastructure stays intact for the existing in-app gate, and converted leads get auto-flagged via `mark_marketing_lead_converted` after signup completes.

