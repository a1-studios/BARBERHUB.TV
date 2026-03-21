

## Make Tier Crest Eye-Catching + Interactive Ghost Upgrade Prompt

### Problems

1. **Active tiers barely visible**: Wings use thin SVG strokes (1-2px) with low fill opacity (0.12-0.2). On dark backgrounds they're nearly invisible.
2. **Ghost state at 15% opacity is invisible**: Free-tier users see wings/stars at `opacity={0.15}` — practically invisible on dark backgrounds.
3. **No hover/touch interaction on ghost**: The ghost wings don't highlight or prompt upgrade on interaction.
4. **Ring stroke too thin**: The circle around the avatar is only 2-2.5px — not badge-like at all.
5. **`handleRingClick` still blocks subscribed users** (line 383: `if (isActive) return;`) — was supposed to be removed per last plan.

### Design Goal
Make the crest feel like a **verified badge** — immediately recognizable, bold, glowing. Ghost state should be a teaser that lights up on hover to say "upgrade me."

### Changes

#### 1. `AvatarCrest.tsx` — Bold up everything

**Active wings**: Increase stroke widths by ~2x, increase `fillOpacity` from 0.12-0.2 to 0.35-0.5, add stronger glow filters with larger spread. The wings should be **filled and glowing**, not just outlines.

**Ring**: Increase stroke width from 2-3px to 4-5px for active tiers. Add a second outer glow ring for gold/diamond.

**Stars**: Increase `fillOpacity` from 0.9 to 1, increase star size multiplier from 3.5 to 5, add glow filter matching tier color.

**Ghost state**: Change `opacity` from 0.15 to 0.35 so outlines are actually visible. Add a `[hovered, setHovered]` state. On hover/touch (`onMouseEnter`/`onTouchStart`), animate ghost wings to 0.7 opacity with the next-tier color pulsing — like a preview of what they'd get. Show a small "Upgrade" tooltip/label below the crest on hover.

**Remove `if (isActive) return;`** from `handleRingClick` so subscribed barbers can still upgrade.

#### 2. `src/index.css` — Stronger crest animations

Increase the glow intensity in `crestWing*` keyframes:
- Bronze: `drop-shadow` from `10px 0.6` to `16px 0.8`
- Silver: from `14px 0.6` to `20px 0.8`
- Gold: from `20px 0.7` to `28px 0.9`
- Diamond: from `24px 0.8` to `32px 1.0`

Add a new `crestGhostPulse` keyframe that fades ghost wings from 0.35 to 0.6 opacity on a slow cycle, making the ghost subtly alive even without interaction.

Add a `crestGhostHover` class that on hover transitions to 0.7 opacity with a cyan glow — signaling "tap to upgrade."

### Files Changed

| File | Change |
|------|--------|
| `src/components/AvatarCrest.tsx` | Bolder strokes, higher fill opacity, stronger glows, interactive ghost with hover highlight, remove `isActive` guard, add hover state |
| `src/index.css` | Stronger glow keyframes, add ghost pulse + hover animations |

