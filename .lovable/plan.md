

## Goal
Wire up the **one-tap social sign-in** (Google + Apple + Instagram) inside the `LaunchWizard` Step 1, pre-fill email from ad URLs, and ensure each role (Barber vs Fan) sees a **role-respected prize pool** on the spin wheel — matching the existing Auth/Sign-Up page social-button row.

## What you'll need for Instagram one-click

Instagram OAuth requires a **Meta Developer App configured for Instagram Basic Display / Facebook Login** and that login provider enabled in Supabase. Concretely:

1. **Meta for Developers app** (https://developers.facebook.com/apps/)
   - Create/select an app → add the **Facebook Login** product (Instagram OAuth runs through it).
   - Add **OAuth redirect URI**: `https://msuepyfssovvkjzpfjzu.supabase.co/auth/v1/callback`
   - Copy the **App ID** and **App Secret**.
2. **Supabase Dashboard → Authentication → Providers → Facebook** (Instagram on Supabase is exposed via the Facebook provider with Instagram scopes; the dedicated `instagram` provider is deprecated for new apps).
   - Toggle ON, paste App ID + App Secret, save.
3. **No code-side secret needed** — Supabase handles the token exchange. The frontend just calls `supabase.auth.signInWithOAuth({ provider: 'facebook' })` (or `'google'` / `'apple'`). Meta access token + the existing `META_ACCESS_TOKEN` for CAPI are unrelated — the CAPI token is for *server-side conversion tracking*, not user login.

I'll surface the button labeled "Continue with Instagram" but route through the `facebook` provider with `scope: 'email,public_profile'` so the user sees the standard Meta OAuth screen (Instagram login is accepted there).

## Role-respected prizes
`StepSpin` already accepts a `role` prop and the existing `useFreemiumPrizes` / `VaultSpinWheel` returns different prize pools per role. Verifying:
- **Barber prizes**: Free month of Bronze tier, +visibility boost, +entry credits, +BB tokens.
- **Fan prizes**: 3x voting power, sponsor banner credits, BB tokens, free spin.

I'll confirm the wheel reads `role` on mount and don't change the wheel itself — just make sure `StepSpin` always passes the role chosen in Step 2 (and the role from `prefilledRole` when resuming after OAuth).

## Changes

### 1. `StepEmail.tsx` — add the 3-icon social row at the top
Match the existing `LandingHero` / `AuthDialog` row (Google · Apple · Instagram). Layout above the email field:
```
┌──────────────────────────────────┐
│   [G]    [Apple]    [IG]         │  ← 3 round 56px buttons
│  ──────── or use email ────────  │
│  [ Email address ____________ ]  │
│  [        Continue →         ]   │
└──────────────────────────────────┘
```
- Each icon: 56×56 glass circle, white border, brand-color glow on hover.
- Tap behavior:
  1. Opens an **inline mini "Pick your side" sheet** (Barber/Fan tiles, identical visual to `StepRole` but compact) — required because the spin wheel needs role context.
  2. Stores `pending_social_role` + `wizard_resume_spin = 'true'` in `localStorage`.
  3. Calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/' } })` with the right provider id (`google` / `apple` / `facebook`).
  4. Fires Meta `Lead` + Google Ads `Lead` with shared `event_id` before redirect.

### 2. `LaunchWizard.tsx` — pre-fill + resume flow
- Read email pre-fill: `getEmailFromUrl()` (already exists in `urlParams.ts`, verified). If found, initialize `state.email`, fire `Lead` once on mount, and start at **Step 2** (Role).
- Add props `startStep?: number` and `prefilledRole?: 'barber' | 'fan'` so `Index.tsx` can re-mount the wizard at Step 4 (Spin) after OAuth round-trip.
- When `prefilledRole` is set, the wizard skips Steps 2 and 3 (role + country — country is already on the user's profile post-OAuth via Google's locale, fall back to `getCountryFromUrl()`) and lands directly on Spin.
- Hide the Back button on the first visible step in any pre-filled flow.

### 3. `Index.tsx` — OAuth resume detection
After auth state loads, check:
```ts
if (user && localStorage.getItem('wizard_resume_spin') === 'true') {
  const role = localStorage.getItem('pending_social_role') as 'barber' | 'fan';
  // mount <LaunchWizard mode="live" startStep={4} prefilledRole={role} />
  // clear both localStorage keys
}
```
- Fires Meta `CompleteRegistration` + Google Ads conversion once spin completes (already wired in `StepLiveFinalize`).

### 4. `StepSpin.tsx` — verify role-respected prizes
- Confirm `role` prop is passed through to `VaultSpinWheel`.
- Pass `prefilledRole ?? state.role` so resumed-from-OAuth flow still gets correct pool.
- No prize-pool logic changes — wheel already differentiates.

### 5. Tracking continuity
- Both Meta Pixel (`Lead`, `CompleteRegistration`) and Google Ads gtag conversions keep firing on the same step boundaries; OAuth path adds the same `Lead` event at icon-tap with provider in `custom_data` for audience segmentation (`{ user_role, signup_method: 'google' | 'apple' | 'instagram' }`).

## Files Touched

| File | Change |
|---|---|
| `src/components/coming-soon/StepEmail.tsx` | Add 3-icon social row + "or use email" divider above existing input; inline mini role-pick sheet on icon tap; OAuth invocation with localStorage flags; fire Meta + Google Ads `Lead` |
| `src/components/coming-soon/LaunchWizard.tsx` | Add `startStep` + `prefilledRole` props; pre-fill email from URL + auto-skip Step 1; hide Back on first visible step in skipped flows |
| `src/components/coming-soon/StepSpin.tsx` | Ensure `role` flows through (use `prefilledRole ?? state.role`) so Barber/Fan prize pools render correctly |
| `src/pages/Index.tsx` | Detect `wizard_resume_spin` flag post-auth and re-mount wizard at Step 4 with `prefilledRole`; clear flags |
| `src/lib/urlParams.ts` | (Already has `getEmailFromUrl` from prior plan — verify only) |

## What you need to do (one-time setup)
1. In **Meta for Developers**, add this redirect URI to your app's Facebook Login → Valid OAuth Redirect URIs:
   `https://msuepyfssovvkjzpfjzu.supabase.co/auth/v1/callback`
2. In **Supabase Dashboard → Authentication → Providers**, enable **Facebook** (paste App ID + App Secret), enable **Google** (already documented), enable **Apple** (requires Apple Developer membership + Service ID + key — separate setup).
3. No new secrets in the codebase — Supabase handles all OAuth tokens; your existing `META_ACCESS_TOKEN` continues serving server-side CAPI conversions only.

## Out of Scope
- Apple Sign-In Apple Developer Console setup (requires paid Apple Developer membership — surface the button but it will show "coming soon" until you complete Apple's portal config).
- Server-side prize ledger changes (existing `spin-wheel` edge function already enforces role-aligned prize pools).
- Magic-link passwordless sign-in (separate flow).

## Result
- Step 1 of the wizard now leads with **3 round social buttons (Google · Apple · Instagram)** matching the existing sign-up page row, then "or use email" + the email input.
- Ad-click visitors with `?email=...` skip Step 1 entirely.
- Social-login visitors complete OAuth → land back on `/` authenticated → wizard automatically re-opens on the **Spin step** with their chosen role's prize pool ready to spin.
- Cold-typed-email visitors keep the full 5-step gamified flow.
- All Meta CAPI + Google Ads conversion events fire with shared `event_id`s and `signup_method` custom data for proper audience attribution.

