

## Redesign Tier Ring as Distinct Profile Borders (Overwatch Rank Style)

### Problem
The current tier ring system uses thin SVG arc strokes and small LED dots that are barely visible. The ghost preview for free-tier users shows 3 faint arcs that don't read as a proper "rank border." The user wants each tier to look **dramatically different** -- like how Overwatch rank portraits have completely distinct border frames around the player icon.

### Design Approach

Instead of thin SVG strokes + floating LED dots, each tier gets a **thick, visually distinct border frame** around the avatar:

| Tier | Border Style | Visual Identity |
|------|-------------|-----------------|
| **Free** | Thin `2px` muted gray border, no effects | Plain, clearly "unranked" |
| **Bronze** | `3px` solid warm orange border + subtle outer glow pulse | Warm copper feel, single-color |
| **Silver** | `3.5px` solid cool silver border + brighter glow + rotating shimmer sweep | Metallic, premium feel |
| **Gold** | `4px` solid bright gold border + intense double-layer glow + continuous shimmer + inner radiance | Elite, unmistakable |
| **Ghost (free)** | 3-segment dashed border showing bronze/silver/gold colors at 30-40% opacity, thicker `3px` strokes with visible glow filters | Aspirational preview -- clearly shows "these are the tiers you could have" |

### Key Changes

**`TierRing.tsx`** -- Complete visual overhaul:
- Remove LED dot system entirely (the floating dots don't read well)
- **Active tiers**: Use thick CSS borders with `box-shadow` for glow. Each tier has progressively thicker borders and more intense glow. Bronze = single glow layer, Silver = double glow + shimmer, Gold = triple glow + shimmer + inner light.
- **Ghost preview**: Keep SVG approach but make strokes **much thicker** (6-8px instead of 3-4px), increase opacity to 30-40%, and add stronger blur filters so each segment clearly glows its tier color. Add small gap between segments for visual separation.
- Add `4px` padding between border and avatar so the ring is clearly separated from the photo.

**`src/index.css`** -- Update animations:
- Make `tierGlowBronze/Silver/Gold` use much more visible `box-shadow` values
- Increase ghost segment opacity in animations (from 0.25-0.35 to 0.35-0.55)
- Remove LED orbit animation (no longer needed)
- Add `tierShimmerSweep` for silver/gold -- a rotating highlight that sweeps around the border

### Files Changed

| File | Change |
|------|--------|
| `src/components/TierRing.tsx` | Remove LED system. Thicken active tier borders (3-4px with padding). Thicken ghost SVG strokes (6-8px) with higher opacity. Add padding between ring and avatar. |
| `src/index.css` | Boost glow intensities for all tiers. Increase ghost opacity. Remove LED orbit animation. Add shimmer sweep for silver/gold borders. |

