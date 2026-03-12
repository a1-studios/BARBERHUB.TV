

## Ghost Tier Ring: Barber-Only + Overwatch-Style Rank Borders

### Changes

**1. Remove ghost ring from fans** — `FanProfileHeader.tsx` currently wraps the avatar in `<TierRing tier="free">`. Remove the `TierRing` wrapper entirely so fans get a plain avatar with no tier ring system.

**2. Make ghost ring much more visible with Overwatch-style ranked borders** — Instead of a barely-visible `border-orange-500/15`, redesign the free-tier ghost to show all 3 rank levels as distinct border segments around the avatar, like Overwatch's rank emblems:

**`TierRing.tsx`** — When `tier === 'free'` and `showGhostPreview`:
- Render 3 concentric border segments (arcs) around the avatar using SVG or CSS conic-gradient, each representing a tier:
  - **Bronze arc** (bottom-left third): orange-500 at ~20% opacity, thin solid border segment
  - **Silver arc** (top third): slate-300 at ~15% opacity, thin solid border segment  
  - **Gold arc** (bottom-right third): yellow-400 at ~12% opacity, thin solid border segment
- Each arc edge pulses faintly with its tier color glow
- The overall effect: user sees a segmented ring showing 3 "locked" rank tiers, clearly distinguishable
- Use an SVG circle with 3 `stroke-dasharray` arcs, each colored per tier, with a subtle glow filter

**`src/index.css`** — Update `tierGlowGhost` animation to be brighter/more visible. Add a `animate-tier-ghost-pulse` that cycles through highlighting each segment briefly (bronze → silver → gold) to draw attention.

### Active tier rings stay the same
Bronze/Silver/Gold active rings remain unchanged — full opacity, LEDs, shimmer etc.

### Files Changed

| File | Change |
|------|--------|
| `src/components/TierRing.tsx` | Replace ghost ring from simple border to SVG-based 3-segment Overwatch-style rank border with bronze/silver/gold arcs. Each arc has its tier color at low opacity with edge glow. |
| `src/components/fan/FanProfileHeader.tsx` | Remove `TierRing` wrapper from avatar — fans don't get tier rings. |
| `src/index.css` | Update ghost animation to be more visible. Add `animate-tier-ghost-segment` that sequentially highlights each tier arc. |

