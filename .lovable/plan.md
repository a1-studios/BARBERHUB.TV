

## Redesign M4M Heartbeat Icon — Heart + Shield with Glowing Edge Animation

### New Icon Design
A **heart shape** with a **shield emblem inside** it. The shield represents protection/trust, the heart represents care.

### Three Visual States

1. **Free/Uncertified** — Very low visibility (15% opacity), no glow, muted grey color
2. **Certified (not paid)** — Brighter (60% opacity), subtle edge glow animation, Zion Blue color
3. **Completed (certified + paid)** — Full brightness, heartbeat pulse animation, bright glowing edge that traces around the heart outline continuously

### Changes

#### `src/components/m4m/M4MHeartbeat.tsx`
- Replace `HandsHeartIcon` SVG with new `HeartShieldIcon`:
  - Outer path: heart silhouette
  - Inner path: shield shape centered inside the heart
  - Add a duplicate stroke path for the glowing edge effect (uses SVG `stroke-dasharray` + `stroke-dashoffset` animation for a light tracing effect)
- State A (uncertified): static, `opacity-[0.15]`, grey
- State B (certified): Zion Blue at 60% opacity, CSS animation `animate-edge-glow` (subtle pulsing glow on the stroke)
- State C (certified + paid): Zion Blue at full brightness, Framer Motion `scale` heartbeat animation + bright `drop-shadow` glow + CSS `animate-trace-light` on the edge stroke (light travels around the heart outline)

#### `src/index.css`
- Add two new keyframe animations:
  - `@keyframes edgeGlow` — subtle pulse of the stroke opacity/shadow
  - `@keyframes traceLight` — animates `stroke-dashoffset` so a bright segment travels along the heart path

