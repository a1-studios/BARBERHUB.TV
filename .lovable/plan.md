# Single-Screen Mobile Landing Redesign

Restructure `VelvetRopeLanding.tsx` so the entire experience fits within a single 9:16 iPhone viewport (no scroll), with adaptive scaling for iPad/desktop.

## New vertical order (top → bottom)

```
┌──────────────────────────────┐
│  Signature Header (preserved)│
├──────────────────────────────┤
│  WHERE BARBERS become        │  ← Headline (smaller, "legends" orange)
│  LEGENDS                     │
├──────────────────────────────┤
│  Live Stats Row (4 tiles)    │
├──────────────────────────────┤
│  Watch Feed Strip teaser     │
├──────────────────────────────┤
│  Email/phone inline sign-in  │
├──────────────────────────────┤
│  [ JOIN ] ← rotating CTA     │  ← Smaller, cyan neon outline
│  Already a member? Sign in   │
└──────────────────────────────┘
```

## Changes

### 1. `LegendsHeadline.tsx`
- Shrink type scale from `clamp(2rem, 9vw, 3.5rem)` → `clamp(1.5rem, 6.5vw, 2.5rem)` so two-line headline fits without crowding.
- Apply orange accent to **"legends"** (currently on "Barbers"). "Barbers" returns to white.
- Tighten line-height + spacing.

### 2. `VelvetRopeLanding.tsx` — layout overhaul
- Convert outer container to a strict single-viewport flex column: `h-[100dvh]`, no scroll, sections sized with `flex-none` and one `flex-1` spacer to absorb slack.
- Reorder children to match the diagram above.
- Reduce vertical padding on every section (`py-2` / `py-3`) to guarantee fit on a 390×608 viewport.
- Move the SPIN CTA from the top auth card to the bottom of the page (above the "Already a member?" footer).
- Strip the old large gradient CTA styling.

### 3. New `RotatingJoinCTA.tsx` (small component)
- Compact pill button (~ `h-11 px-6`, `text-sm font-black uppercase tracking-[0.25em]`).
- **Cyan neon outline**: `border border-cyan-400/70`, `shadow-[0_0_14px_rgba(34,211,238,0.55)]`, transparent/very dark background so it reads as outline-only.
- Inside: a single rotating word, cycling every 3s through: `JOIN → WIN → WATCH → VOTE → CHALLENGE`.
- Word swap animated with a short fade/slide (`animate-fade-in` + key-based remount).
- `useEffect` interval, cleared on unmount, paused while tab hidden (visibility check).
- Click → opens `LaunchWizard` (same `setSpinOpen(true)` behavior as today).

### 4. Adaptive scaling
- Mobile (default, ≤640px): single screen, no scroll, tight spacing per above.
- Tablet (`md:`): same layout, increase headline & stat type sizes, larger paddings, max-width container `max-w-2xl mx-auto`.
- Desktop (`lg:`): `max-w-3xl`, more generous gaps; layout remains a single column (no horizontal restructure) so it still feels native-mobile-first.

## Out of scope
- Auth flow, `LaunchWizard`, stats data source, header internals, routing.
- No DB / edge function changes.

## Files touched
- `src/components/landing/VelvetRopeLanding.tsx` (rewrite layout)
- `src/components/landing/LegendsHeadline.tsx` (size + accent swap)
- `src/components/landing/RotatingJoinCTA.tsx` (new)
