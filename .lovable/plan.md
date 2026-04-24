

## Goal
Ship the immersive, gamified Coming Soon wizard — but with **Neon Orange as the dominant highlight** (Cyan demoted to a secondary accent), strict **Barber/Fan binary roles**, and explicit hooks for **Meta Ads + Google Ads** attribution and conversion tracking.

## Color System Correction
- **Primary highlight (90%)**: Neon Orange `#FF5F1F` → Amber `#FFB347` gradient. Used for: focus rings, progress fill, active states, CTAs, glow halos, selected tiles, coin reveal, shimmer.
- **Secondary accent (10%)**: Cyan `#00F0FF` reserved only for tiny "live" data signals (e.g., the live-counter pulse dot, the "data-secured" tick on the reveal). Never on inputs, buttons, or progress.
- **Surface**: Glassmorphic `bg-white/5 backdrop-blur-2xl border-white/10`.
- **Currency moments**: Gold `#FFD37A → #FF8C00` shimmer (already brand-defined).

## Roles (unchanged)
Two tiles only: **Barber** (Scissors icon) and **Fan** (Heart icon). No Judge, no Client. `StepRole.tsx` stays as-is structurally; only restyled.

## Visual & Motion Spec

### Wizard shell (`LaunchWizard.tsx`)
- Glass card: `bg-white/5 backdrop-blur-2xl border border-orange-500/20 rounded-[24px] shadow-[0_0_60px_rgba(255,95,31,0.35)]`.
- Inner top edge: 1px white→transparent gradient highlight (light-streak).
- **Mobile (<768px)**: bottom sheet — slides up from bottom, occupies lower 75vh, drag-down handle at top to dismiss, primary CTA pinned in lower 40% for thumb reach.
- **Desktop (≥768px)**: center-floating glass card, max-w-lg.

### Transitions
- Replace current `y: 12 → 0` with **direction-aware horizontal spring slide**: forward = incoming `x: 100% → 0` / outgoing `x: 0 → -100%`; back = inverted. `transition={{ type: 'spring', stiffness: 320, damping: 32 }}`.
- Track a `direction` ref (1 = forward, -1 = back) so AnimatePresence animates correctly when user taps Back.

### Swipe gesture (new `SwipeableStep.tsx` wrapper)
- Framer Motion `drag="x"`, `dragConstraints={{ left: 0, right: 0 }}`, `dragElastic={0.2}`.
- On `dragEnd`: if `offset.x < -80` and `canAdvance` → next; if `offset.x > 80` → back. Validation gates (e.g., email valid) still apply.
- Used by all 5 steps.

### Progress (new `SegmentedProgress.tsx`)
- 5 segments at top of wizard. Inactive = `bg-white/10`. Active = orange→amber pill with `shadow-[0_0_18px_rgba(255,95,31,0.6)]` and inner shimmer sweep. Completed = solid orange (no glow).
- Replaces current dot row.

### Inputs (StepEmail / StepCountry)
- `h-14`, `rounded-[14px]`, `border border-orange-500/30 bg-black/40`.
- Focus: `border-orange-500 shadow-[0_0_22px_rgba(255,95,31,0.55)] ring-2 ring-orange-500/40`.
- Floating label that lifts on focus.

### Buttons (dual-layer pill — used everywhere)
- Outer: `border border-white/30` (the "0.6px white border" — Tailwind's thinnest).
- Inner: `bg-gradient-to-br from-[#FF5F1F] via-[#FF8C00] to-[#FFB347]`.
- Top streak: `inset 0 1px 0 rgba(255,255,255,0.45)`.
- `whileTap={{ scale: 0.95 }}` + `navigator.vibrate?.(10)` for haptic.

### Role tiles (StepRole)
- Glass surface, larger (h-44), icon in orange-glow circle.
- On select: 250ms scale-pulse (1 → 1.06 → 1) + orange border bloom (`shadow-[0_0_30px_rgba(255,95,31,0.7)]`) before auto-advancing.

### Spin step (StepSpin)
- Wrap existing `VaultSpinWheel` in glass frame with subtle scanline overlay; orange ring around the wheel housing.

### Reveal finale (StepReveal) — **3D Barber Coin Pop**
- Circular orange-gold BB coin (CSS 3D, no Three.js):
  - Initial: `scale: 0, rotateY: 720deg, y: 100`.
  - Spring to: `scale: 1.2 → 1, rotateY: 0, y: 0` over 700ms (`stiffness: 180, damping: 12`).
- Radial **orange** ring expands behind it (`scale: 0→4, opacity: 0.6→0`, 800ms).
- Prize label below: gold gradient with diagonal shimmer sweep every 2.5s.
- Confetti via existing `celebrationEffects.ts`.
- Tiny cyan tick chip: "✓ Spot secured" (only place cyan appears).
- Email + "We'll email you when doors open" in muted glass chip.
- Done CTA = orange dual-layer pill.

### Background (ComingSoon page)
- Add looping muted Cloudflare Stream video layer (reuse `DynamicBattleHero` pool) behind `bg-black/55 backdrop-blur-sm`.
- Pause video while wizard is open (shared state).

## Meta Ads + Google Ads Integration

### Already wired (verify, don't rebuild)
- Meta Pixel (`3952840548352887`) in `index.html` + SPA `useMetaPixelPageView`.
- `meta-capi-track` Edge Function mirrors `Lead` + `CompleteRegistration` server-side with hashed email/country and `user_role` custom_data.
- `?country=`, `utm_*`, `fbclid` capture in `src/lib/urlParams.ts`.

### New for Google Ads
- **gtag base**: add Google Ads tag to `index.html` `<head>`, parameterized by `VITE_GOOGLE_ADS_ID` (env var, e.g., `AW-XXXXXXXXX`). Skip render if env is empty so devs aren't blocked.
- New `src/lib/googleAds.ts`:
  - `gtagTrackPageView(path)` — fired from a new `useGoogleAdsPageView` hook in `App.tsx` (mirrors the Meta pageview hook).
  - `gtagConversion({ sendTo, value, currency, transaction_id })` — generic conversion firer. `sendTo` = `${GOOGLE_ADS_ID}/${conversionLabel}`.
  - Two conversion labels (env-driven, optional): `VITE_GOOGLE_ADS_LEAD_LABEL` (Step 1 email) and `VITE_GOOGLE_ADS_REGISTRATION_LABEL` (Step 5 reveal). If missing, function no-ops gracefully.
- **gclid capture**: extend `src/lib/urlParams.ts` `captureAttribution()` to also persist `gclid` and `gbraid`/`wbraid` to `sessionStorage`. These get attached to `marketing_leads` insert.
- **`marketing_leads` migration**: add `gclid text`, `gbraid text`, `wbraid text` columns (additive, nullable). RLS unchanged.

### Wizard fire points (parallel to Meta)
| Step | Meta | Google Ads |
|---|---|---|
| 1 Email captured | `Lead` (pixel + CAPI) ✅ existing | `gtagConversion({ sendTo: ...LEAD_LABEL, transaction_id: event_id })` |
| 5 Reveal complete | `CompleteRegistration` (pixel + CAPI) ✅ existing | `gtagConversion({ sendTo: ...REGISTRATION_LABEL, value: prize_bb/5, currency: 'USD', transaction_id: event_id })` |

Each pair shares the same `event_id` (UUID) to enable cross-platform deduplication if you later wire Google's enhanced conversions / GA4 measurement protocol.

### Type declarations
`src/vite-env.d.ts`: add `Window.gtag`, `Window.dataLayer`, and the new `VITE_GOOGLE_ADS_*` env vars to `ImportMetaEnv`.

## Files Touched

| File | Change |
|---|---|
| `src/pages/ComingSoon.tsx` | Add looping muted Cloudflare Stream backdrop with dim/blur; pause when wizard open |
| `src/components/coming-soon/LaunchWizard.tsx` | Glass shell; direction-aware horizontal spring slides; mount `SegmentedProgress`; mobile bottom-sheet variant; `direction` state for back/forward |
| `src/components/coming-soon/SwipeableStep.tsx` | **NEW** — drag wrapper used by all steps |
| `src/components/coming-soon/SegmentedProgress.tsx` | **NEW** — 5-segment orange progress bar with glowing active pill |
| `src/components/coming-soon/StepEmail.tsx` | h-14 input, orange focus glow, floating label, swipe-to-advance, fire Google Ads `Lead` conversion alongside existing Meta `Lead` |
| `src/components/coming-soon/StepRole.tsx` | Larger glass tiles, orange bloom on select, scale-pulse confirm beat, vibrate(10) — Barber/Fan only |
| `src/components/coming-soon/StepCountry.tsx` | Orange focus on selector, swipe gestures, dual-layer pill CTA |
| `src/components/coming-soon/StepSpin.tsx` | Glass frame + scanline overlay around wheel; orange ring |
| `src/components/coming-soon/StepReveal.tsx` | 3D BB coin pop, orange radial ring, gold shimmer prize label, confetti, cyan "✓ Spot secured" micro-chip, fire Google Ads `Registration` conversion alongside existing Meta event |
| `src/lib/googleAds.ts` | **NEW** — gtag wrapper: `gtagTrackPageView`, `gtagConversion` |
| `src/hooks/useGoogleAdsPageView.tsx` | **NEW** — SPA pageview for Google Ads |
| `src/lib/urlParams.ts` | Extend `captureAttribution()` to persist `gclid` / `gbraid` / `wbraid` |
| `src/App.tsx` | Mount `useGoogleAdsPageView` next to `useMetaPixelPageView` |
| `src/vite-env.d.ts` | Add `Window.gtag` / `Window.dataLayer` + `VITE_GOOGLE_ADS_*` env types |
| `index.html` | Add Google Ads gtag base script (env-gated; renders empty when `VITE_GOOGLE_ADS_ID` missing) |
| `supabase/migrations/<ts>_marketing_leads_gclid.sql` | Add `gclid`, `gbraid`, `wbraid` columns |

## Out of Scope
- Audio "whoosh" SFX (no asset, requires user-gesture handling).
- Server-side Google Ads conversions (Enhanced Conversions / Measurement Protocol) — wire the browser tag first; server mirror is a separate request once you provide the conversion labels.
- Three.js coin (CSS 3D achieves the pop without bundle cost).
- Audio cue, Judge role.

## Result
- ComingSoon becomes a cinematic, swipe-driven, glass intake over a video backdrop. Every transition feels like a native app.
- **Orange owns the experience**; cyan reduced to a single confidence-tick. Brand consistency restored.
- Strict Barber/Fan roles preserved — no DB or role-system breakage.
- `Lead` (Step 1) and `CompleteRegistration` (Step 5) fire on **both** Meta Pixel + CAPI **and** Google Ads gtag with shared `event_id`s; `gclid`/`gbraid`/`wbraid` get persisted to `marketing_leads` for full Google attribution alongside existing Meta attribution.
- Finale lands a 3D coin pop with gold shimmer + orange ring + confetti — a high-dopamine reward that visually rhymes with the Barber Bucks economy.

