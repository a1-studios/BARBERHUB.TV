## Landing Page Restructure

Goal: simplify the public landing to match the reference — signature header, prominent SPIN CTA, an inline email entry, a bold "Where Barbers become legends" headline with live stats, and the WatchFeedStrip teaser at the bottom. Remove the InsideTheHubStage and BottomGlobeSection clutter.

### Final structure (top → bottom, mobile-first, no horizontal scroll)

```text
┌──────────────────────────────────────────┐
│ Signature header (preserved as-is)       │  ← BARBER-HUB pole + wordmark
├──────────────────────────────────────────┤
│  ✨ SPIN TO WIN & JOIN  →                │  ← big orange gradient CTA
│  "+15 BB on us" microcopy                │
├── OR SIGN IN ────────────────────────────┤
│  [ email or phone ___________________ ]  │  ← single inline input
│  [ Continue ]                            │  ← opens AuthModalV2 prefilled
│  Forgot? · Already a member? Sign in     │
├──────────────────────────────────────────┤
│  where Barbers become legends            │  ← display headline (orange accent)
│                                          │
│  500+   1.2k+   5k+    98%               │  ← LIVE counts from DB
│ Barbers Creators Community Satisfaction  │
├──────────────────────────────────────────┤
│  WatchFeedStrip (horizontal teaser)      │  ← only retained teaser
└──────────────────────────────────────────┘
```

### Changes

1. **`src/components/landing/VelvetRopeLanding.tsx`** — rewrite layout:
   - Keep existing signature header block verbatim.
   - Replace the single "Enter Barber Hub — Free" button with a two-tier auth block:
     - Primary: `SPIN TO WIN & JOIN →` gradient pill that opens `LaunchWizard` (existing component, already used on `Index.tsx`) OR falls back to `AuthModalV2` signup. Microcopy: "+15 BB on us".
     - Divider: `OR SIGN IN`.
     - Inline `<input>` for email/phone (smart-detect like AuthModalV2's identity step) + `Continue` button. Submitting opens `AuthModalV2` with mode `signin` and pre-fills the identifier (new prop `prefillIdentity?: string`).
     - Bottom footer link: "Already a member? Sign in" (unchanged behavior).
   - Replace `InsideTheHubStage` with the headline + stats block.
   - Remove `BottomGlobeSection`.
   - Keep `WatchFeedStrip` pinned at the bottom.

2. **New `src/components/landing/LegendsHeadline.tsx`** — `where Barbers become legends` display headline using Bebas Neue / existing display font with orange accent on "Barbers". Centered, generous tracking.

3. **New `src/components/landing/LiveStatsRow.tsx`** — 4-column grid (responsive to 2×2 under 360px):
   - Barbers — `count(profiles where user_type='barber')`
   - Creators — `count(barber_profiles where competition_entries.count > 0)` (or simply count of barbers with any submitted video)
   - Community — `count(profiles)` total users
   - Satisfaction — derived from reviews avg (`avg(rating)/5*100`) rounded, fallback `98%` if no reviews.
   - All numbers formatted (`500+`, `1.2k+`) via a small util that floors to the nearest meaningful threshold so display stays clean.
   - Data loaded via a single React Query hook `useLandingStats` calling a new lightweight SQL view or 4 `head:true` count queries against the **public** schema (no auth required). Uses existing public-readable tables (`profiles`, `barber_profiles`, `reviews` if present).

4. **`src/components/auth/AuthModalV2.tsx`** — add optional `prefillIdentity?: string` prop that pre-populates the identity input on open. No flow change.

5. **Cleanup** — `VelvetRopeLanding` no longer imports `InsideTheHubStage` or `BottomGlobeSection`. Leave those files in place (still used elsewhere or available for rollback).

### Out of scope
- Auth flow changes (still OTP-only — inline email just pre-fills the modal).
- `LaunchWizard` internals (reused unchanged).
- `Index.tsx` (only renders `VelvetRopeLanding` for guests; no change needed).
- New database tables. Stats query reads existing public-readable tables.
- Password sign-in (reference's password field is intentionally not implemented — kept OTP-only per your answer).

### Technical notes
- Public count queries: `supabase.from('profiles').select('*', { count: 'exact', head: true })` etc. Will verify each table is granted to `anon` before relying on it; fall back to a public RPC (`get_landing_stats`) returning a single row of 4 counts if any table is auth-only. Plan B (RPC) requires a tiny migration with SECURITY DEFINER + `GRANT EXECUTE TO anon`.
- All colors/spacing through existing semantic tokens; no new hex values.
- Viewport: design fits 360–768 width without horizontal scroll; uses `h-[100dvh] flex-col` layout already in place.
