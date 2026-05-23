
# Phase 1 (Final) — Velvet Rope + OTP, Parallel & Non-Destructive

All previous constraints stand: `Index.tsx` body untouched except for a single early-return, no legacy auth files deleted, `useAuth.tsx` exports unchanged, `AuthDialog` and every existing CTA preserved. Adds: binary Barber/Fan logic preserved end-to-end, sub-category aggregation surfaced on the Velvet Rope, and a dynamic teaser grid built from existing components.

---

## Pillar 1 — Velvet Rope Landing (Isolated, Dynamic, Binary-Aware)

### 1.1 Component scaffold
New file: `src/components/landing/VelvetRopeLanding.tsx`. Self-contained. Imports only existing components — no new visual primitives.

### 1.2 Binary role preservation
- The landing surfaces **two visitor intents** before auth: **"I'm a Barber"** vs **"I'm a Fan"**. Stored in modal-local state and forwarded to `AuthModalV2`'s `intendedRole` prop.
- After successful OTP verify, `AuthModalV2` writes the chosen role exactly the way the current onboarding does — via `user_roles` insert + `profiles.user_type` — so the existing `useUserRole` / `useUserProfile` / `RoleBadge` / `SubCategoryBadge` pipelines all keep working unchanged.
- Sub-category (`licensed_pro`, `beginner`, `educator`, `official_sponsor`) collection stays in the existing post-signup onboarding flow. Velvet Rope only captures the binary role; sub-cat is captured downstream as it is today. No change to `profiles.subcategory` writers.

### 1.3 Aggregated stats strip (live, role-segmented)
A horizontal "League Pulse" bar at the top of Velvet Rope, read-only, refreshes every 60s via React Query. New SECURITY DEFINER RPC `get_public_league_stats()` returns:
- `barbers_total`, `barbers_licensed_pro`, `barbers_beginner`, `barbers_educator`, `barbers_official_sponsor`
- `fans_total`
- `active_battles`, `live_streams_now`, `countries_represented`, `bb_in_circulation`

All counts come from existing tables (`profiles`, `user_roles`, plus existing public views). RPC is exposed to `anon`. No PII. Reuses `LivePulseMonitor`'s visual language but in a public-safe, role-segmented variant: `src/components/landing/LeaguePulseStrip.tsx`.

### 1.4 Dynamic teaser grid (existing components, locked overlays)
Each tile is one existing component rendered in **read-only teaser mode** behind a translucent "🔒 VIP ONLY — Redeem Invite" overlay. Clicking any locked tile opens `AuthModalV2`. New thin wrapper `src/components/landing/LockedTeaser.tsx` provides the overlay + blur + hover lift; it does not modify the underlying component.

Tiles, in order:

1. **Live PK Battles** → `DynamicBattleHero` (existing). Teases head-to-head challenges.
2. **Watch Feed** → reuses a 3-card horizontal preview of `WatchFeed`'s top items (read via existing public RPC, no new query).
3. **Live Streaming Now** → `LiveBarberStreams` (existing) — barber→barber go-live teaser.
4. **Faction Banners** → `ImmersiveFactionBanners` (existing) — culture & national pride.
5. **Global League Map** → `GlobalLeagueDashboard` (existing) — national/international competition.
6. **2026 Championship** → `tournament/PrizePoolCard` + `LiveMatchCounter` (existing) — international stakes.
7. **Academy & Education** → `academy/AcademyRail` (existing) — educator sub-cat showcase.
8. **Brand Deals & Sponsors** → `factions/SponsoredBadge` + `admin/SponsorAdsManager`'s public preview slice (existing) — official_sponsor sub-cat showcase.
9. **M4M Mental Health Fund** → `m4m/M4MHeartbeat` (existing) — medical/community pillar.
10. **Universal Barter Gateway** → `barter/UniversalBarterGateway` (existing) — community/development pillar.
11. **Creator Hub Preview** → `creator/...` first-card teaser — career development.
12. **Product Shelf** → `ProductShelf` (existing) — culture/gear.

Each tile carries a small chip tagging which pillar it represents (Compete · Stream · Education · Brand Deals · Medical · Community · Culture · Development) so the messaging matches the user's framing.

### 1.5 CTAs
- Primary hero CTA: **Redeem VIP Invite** → `AuthModalV2` with `intendedRole=null`.
- Two secondary chips beneath the hero: **I'm a Barber** / **I'm a Fan** → `AuthModalV2` with `intendedRole='barber' | 'fan'`.
- Tiny muted link: "Already a member? Sign in" → `AuthModalV2` in sign-in mode.
- The existing public Sign Up button, Spin CTA, `LandingHero`, `LaunchWizard`, and every other current entry point stay in `Index.tsx` source code, unmodified — they're simply unreachable while Velvet Rope is shown.

### 1.6 `Index.tsx` change (one line)
Insert immediately after the `loading` guard:
```
if (!user) return <VelvetRopeLanding />;
```
Nothing else in `Index.tsx` is touched. To revert: delete that line.

### 1.7 SEO
`VelvetRopeLanding` sets its own `<title>`, meta description, canonical, and JSON-LD via existing SEO helpers — invite-only barber competition platform messaging.

---

## Pillar 2 — Access Code Engine (additive only)

(Unchanged from prior revision.)

### 2A. Migration
- `access_codes` (`code`, `is_active`, `type ∈ {vip,promo}`, `usage_count`, `max_uses`, `notes`, `created_by`).
- `access_code_redemptions` audit table.
- `platform_state` row `global_vip_mode = 'false'`.
- RLS: writes gated by `is_sovereign()`; reads only via SECURITY DEFINER RPCs:
  - `validate_access_code(p_code)`
  - `redeem_access_code(p_code, p_user_id, p_email)` (FOR UPDATE row lock — economy-integrity standard)
  - `is_global_vip_mode()`
  - `get_public_league_stats()` (Pillar 1.3)

### 2B. Sovereign HQ admin
- New `src/components/sovereign/AccessCodePanel.tsx` mounted as a new tab in `SovereignHQ.tsx` (no existing panels altered).
- Global VIP Mode toggle, code generator, codes table, redemption drill-down.
- Edge function `sovereign-access-codes` for all writes, sovereign-JWT verified.

---

## Pillar 3 — Magic Link Tear-Down → DEFERRED

Nothing deleted. `useAuth.tsx`, `AuthHashHandler`, `AuthCallback`, `AuthDialog`, `ForgotPasswordForm`, `GoogleOneTap`, `OneTapRaffleReveal`, `ResetPassword`, `authRedirects.ts`, `QuickSocialSignIn` all stay. Cleanup happens in a future phase after the new flow is validated in production.

---

## Pillar 4 — `AuthModalV2` (Parallel, Binary-Aware)

New file: `src/components/auth/AuthModalV2.tsx`. Isolated; only the Velvet Rope mounts it. Uses `supabase.auth.*` directly; does not touch `useAuth`'s API.

### Props
- `open: boolean`
- `intendedRole?: 'barber' | 'fan' | null`
- `mode?: 'signup' | 'signin'`
- `onClose: () => void`

### State machine: `'gate' | 'role' | 'identity' | 'verify' | 'done'`

**Step 0 — Boot.** Read VIP mode via `usePlatformState('global_vip_mode')`.

**Step 1 — Gate.** Single uppercase access-code input.
- VIP mode ON → required, label "VIP Invite Code", validates via `validate_access_code`.
- VIP mode OFF → optional, label "Promo / Referral Code (optional)".
- Stores `{ codeId, codeType }` in modal state.

**Step 2 — Role (only if `intendedRole == null` and `mode === 'signup'`).** Two large cards: **Barber** (compete, stream, earn BB) vs **Fan** (vote, sponsor, watch). Selection is the binary role.

**Step 3 — Identity.** Single "Email or Phone Number" input.
- Phone regex match → toast "SMS login is in beta. Please use your email." Stay on step.
- Email regex match → `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { intended_role: chosenRole } } })`. (No `emailRedirectTo` — pure 6-digit token flow. Resend SMTP wiring untouched.) Loading state disables submit to prevent spam. Advance.

**Step 4 — Verify.** 6-cell `input-otp` PIN.
- Auto-submit on 6 digits + manual Verify button: `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
- On success:
  1. If first-time user (no `user_roles` row), insert `user_roles (user_id, role=chosenRole)` and upsert `profiles.user_type=chosenRole` — exactly mirroring the existing onboarding path. Sub-category is **not** set here; it remains owned by the existing post-signup onboarding (`useProfileSetup`, `WelcomeModal`, etc.) so `licensed_pro` / `beginner` / `educator` / `official_sponsor` aggregation behavior is unchanged.
  2. If a code was supplied in Step 1, call `redeem_access_code(codeId, user.id, email)`.
  3. Close modal. Existing `useAuth` session listener picks up the new session → Velvet Rope's early-return falls through → user lands on the normal authenticated `/` view, where existing role-based UI (Fan Arena vs Barber Arena, `RoleBadge`, `SubCategoryBadge`, `useUserRole`-gated CTAs) renders correctly. Existing onboarding flows trigger as today for sub-category capture.
- **Resend Code** button with 60s client countdown; calls `signInWithOtp` again. Friendly toasts for invalid / expired / rate-limited.
- "Edit email" link returns to Step 3.

### Wiring
- Velvet Rope's "Redeem VIP Invite" + "I'm a Barber" + "I'm a Fan" + "Sign in" all open `AuthModalV2`.
- Header, footer, `LandingHero`, `LaunchWizard`, and every existing CTA continue to use legacy `AuthDialog` / signup flows untouched.

### Supabase Auth dashboard (manual, no code)
- Confirm Email OTP enabled, length 6, expiry ≥10 min. Resend SMTP wiring is not modified.

---

## Execution order
1. Migration: tables, RPCs (`validate_access_code`, `redeem_access_code`, `is_global_vip_mode`, `get_public_league_stats`), `platform_state` seed.
2. `AuthModalV2` (parallel, isolated).
3. `LeaguePulseStrip` + `LockedTeaser` + `VelvetRopeLanding` + the one-line `Index.tsx` early-return.
4. Sovereign `AccessCodePanel` + `sovereign-access-codes` edge function.

## Risk & reversibility
- One-line revert restores legacy public homepage exactly.
- Legacy magic-link, password-reset, OAuth journeys remain fully functional.
- Binary Barber/Fan logic and sub-category aggregation pipelines are untouched — Velvet Rope reads aggregates, onboarding writes sub-cats as today.
