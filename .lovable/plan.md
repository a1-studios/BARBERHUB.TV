# Landing Page Mobile Redesign — v2

Redesign `src/components/LandingHero.tsx` only. Single 100svh viewport, zero scroll, native iOS feel. Match the reference image's neon dual-tone outlined boxes (orange→cyan gradient borders).

## Layout (top → bottom, fits 390×694 with no scroll)

```text
┌─────────────────────────────┐
│  Signature Header (as-is)   │  unchanged
│                             │
│   WHERE BARBER              │  WHERE=orange, BARBER=white
│   BECOME LEGENDS            │  BECOME=orange, LEGENDS=white
│                             │
│  ╔═══════════════════════╗  │  Neon gradient-bordered box
│  ║ EMAIL OR PHONE        ║  │  (orange left → cyan right)
│  ║ ┌───────────────────┐ ║  │  inner pill input
│  ║ └───────────────────┘ ║  │
│  ║                       ║  │
│  ║ ┌───────────────────┐ ║  │  SIGN UP button
│  ║ │     SIGN UP       │ ║  │  (orange-filled, white text)
│  ║ └───────────────────┘ ║  │
│  ║ Already a member?     ║  │  Log In link (cyan)
│  ╚═══════════════════════╝  │
│                             │
│  Battle. Vote. Earn.        │  Slogan (UNDER the box)
│  The world's first…         │
│                             │
│   50K+ • 180+ • $1M+        │  Stats (bottom)
└─────────────────────────────┘
```

## Signature Header
Keep current `<header>` block in LandingHero exactly as-is (barber pole + BARBER-HUB wordmark + cyan glow). No changes.

## Title
Replace current "where Barbers become legends" with two tight lines:
- Line 1: `<span class="text-primary">WHERE</span> <span class="text-foreground">BARBER</span>`
- Line 2: `<span class="text-primary">BECOME</span> <span class="text-foreground">LEGENDS</span>`
- Uppercase, bold, tight tracking, ~text-4xl

## Neon Gradient-Bordered Box (the reference)

The reference shows a rounded box with a **bicolor neon outline**: orange glow on the left edge, cyan glow on the right edge, blending across the top/bottom. Recreate with a CSS gradient border:

```tsx
<div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-primary via-primary/40 to-cyan">
  <div className="rounded-2xl bg-background/80 backdrop-blur-xl p-5 space-y-4">
    {/* inner content */}
  </div>
</div>
```

Add outer glow: `shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5),0_0_24px_-4px_hsl(var(--cyan)/0.5)]`.

### Inside the box
1. **Label** — small uppercase `EMAIL OR PHONE` (white/70, tracking-widest, text-[10px])
2. **Input pill** — same gradient border treatment but thinner (`p-[1px]`), inner `bg-white/[0.03] rounded-full px-4 h-11 text-sm`. Single field, smart-detects email vs phone (AuthModalV2 already does this — we just open it with the typed value via `prefillIdentity`).
3. **Sign Up button** — `h-12 rounded-full bg-primary text-white font-bold` with neon outline shadow. On hover/active: shadow intensifies (`shadow-[0_0_24px_hsl(var(--primary))]`), text flips to `text-cyan`.
4. **Sign in link** — centered small text: "Already have an account? <span class="text-cyan">Log In</span>"

## Slogan (moved BELOW the box)

```tsx
<p className="text-center text-xs text-muted-foreground px-6">
  Battle. Vote. Earn. The world's first barber competition platform.
</p>
```

## Stats row stays at bottom, compact (text-xs), border-top removed for cleaner look.

## Behavior

- Clicking "Sign Up" or pressing Enter in the input → `setMode('signup')` and `setAuthOpen(true)`, passing the input value as `prefillIdentity` to `AuthModalV2` (AuthModalV2 already supports this prop).
- Clicking "Log In" → `setMode('signin')` and open modal.
- All OTP flow stays in `AuthModalV2` — no logic changes there.

## Files Touched

| # | File | Change |
|---|------|--------|
| 1 | `src/components/LandingHero.tsx` | Layout rewrite: new title, gradient-bordered box, slogan-under-box, neon buttons |

No other files. No new components, no new deps, no logic changes elsewhere.

## Technical Notes

- All colors via semantic tokens: `hsl(var(--primary))` for orange, `hsl(var(--cyan))` for cyan, `hsl(var(--foreground))` for white, `hsl(var(--background))` for deep black
- `min-h-[100svh]` + `overflow-hidden` on root; use `flex-col` with `gap` not absolute positioning
- `pb-[env(safe-area-inset-bottom)]` on root for iOS notch
- Gradient border technique: outer wrapper with `bg-gradient-to-r` + padding, inner wrapper with `bg-background`
- All buttons get `transition-all duration-300` for smooth neon ramp on hover/active
