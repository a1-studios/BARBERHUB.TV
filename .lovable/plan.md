

## Replace Championship Header with Animated Globe Hub

### What
Replace the static "2026 GLOBAL CHAMPIONSHIP" banner (Portal.tsx lines 149-177) with an energetic, alive-feeling 3D rotating globe section that pulses with world cup energy and shows rotating ticker updates.

### Design
- **3D Globe**: Reuse the existing `Globe3D` component but bump opacity to ~50% (currently 30%), increase rotation speed, and add more vibrant country dots with pulsing animations
- **Overlay content**: Layer the championship title, live dot, and a rotating news ticker on top of the globe
- **Ticker**: A cycling banner at the bottom showing world cup updates like "Next Battle: Sunday 10AM EST", "Prize Pool: $25,000", "127 Barbers Registered", "USA leads with 34 wins" — auto-rotates every 4 seconds
- **Energy effects**: Wrap the whole section in `SphereHolographicWrapper`-style scanning lines and particle effects (CSS only, no extra 3D overhead) — reuse the existing keyframes from that component
- **Size**: ~350px tall container with the globe centered, content overlaid with `absolute` positioning

### Changes

**`src/pages/Portal.tsx` (lines 148-178)**
- Replace the static card with a new `<PortalGlobeHero />` inline section:
  - `relative overflow-hidden rounded-2xl` container, ~350px height
  - Embed `<Globe3D />` as background (absolute, full size, opacity-50)
  - Overlay: gradient vignette + title text + `<LiveMatchCounter />` + pulsing live dot
  - Bottom ticker bar: cycling updates array with `AnimatePresence` fade transitions
  - CSS energy ring border using `conic-gradient` animation (borrowed from `SphereHolographicWrapper`)

**`src/components/Globe3D.tsx`**
- Add optional props: `rotationSpeed`, `dotCount`, `opacity` with defaults matching current behavior
- Increase default dot regeneration to every 2.5s (from 4s) for more activity
- Add orange/cyan pulsing ring around the globe mesh (a second `Sphere` with animated emissive)

### Files
| File | Change |
|------|--------|
| `src/pages/Portal.tsx` | Replace lines 148-178 with globe hero section |
| `src/components/Globe3D.tsx` | Add configurable props, faster dots, energy ring |

