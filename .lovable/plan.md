

## Horizontal Lightning Crack on Mobile

### Problem

The split-screen layout stacks **vertically** on mobile (`flex-col`) -- Barber 1 on top, Barber 2 on bottom. The VS divider sits at the horizontal seam between them. A vertical lightning bolt would look wrong here; the crack needs to run **horizontally** across the screen to match the natural split direction.

On desktop, the layout is side-by-side (`flex-row`), so the crack should remain **vertical**.

### Changes

#### File: `src/components/DynamicBattleHero.tsx`

**Lightning bolt SVG -- responsive orientation:**

- On **mobile**: The SVG lightning bolt path runs **left-to-right** (horizontal zigzag), wider than tall (~60px wide, ~4px tall). It creates the illusion that the screen is cracking apart horizontally between the two stacked videos.
- On **desktop** (`sm:` and up): The bolt runs **top-to-bottom** (vertical zigzag), taller than wide (~4px wide, ~60px tall). It splits the two side-by-side videos.

Implementation approach:
- Use two SVG elements with Tailwind responsive visibility: one horizontal bolt with `block sm:hidden`, one vertical bolt with `hidden sm:block`
- Or use a single SVG with a CSS `rotate-90` on mobile via `rotate-90 sm:rotate-0`

**Energy burst and horizontal crack lines -- responsive direction:**

- On mobile: the radial burst stays the same (it's circular), but the "crack" lines extend **up and down** (vertical) from center instead of left/right
- On desktop: crack lines extend **left and right** (horizontal) from center

This is achieved with Tailwind responsive classes:
- Crack lines: `h-5 w-[1px] sm:h-[1px] sm:w-5` -- vertical on mobile, horizontal on desktop

**Floating particles -- responsive direction:**

- On mobile: particles float upward and downward (along the vertical axis)
- On desktop: particles float left and right (along the horizontal axis)
- Use `translateY` on mobile, `translateX` on desktop via the `isMobile` hook already imported

**VS text and Swords icon:**

- No change needed -- they sit at the center regardless of orientation

### Visual Result

```text
Mobile (top/bottom split):

+------------------+
|   Barber 1       |
|   Video          |
+--~--V⚡S--~------+  <-- horizontal lightning crack
|   Barber 2       |
|   Video          |
+------------------+

Desktop (side-by-side split):

+---------+|+---------+
| Barber 1 || Barber 2 |
|          VS          |
| Video   |⚡| Video   |
|         ||           |
+---------+|+---------+
            ^
     vertical lightning crack
```

### Technical Details

| Element | Mobile | Desktop |
|---------|--------|---------|
| Lightning bolt SVG | Horizontal zigzag (w-14 h-4) | Vertical zigzag (w-4 h-14) |
| Crack lines | Extend up/down (h-5 w-px) | Extend left/right (w-5 h-px) |
| Particles | Float along Y axis | Float along X axis |
| Radial burst | Same (circular) | Same (circular) |
| VS text | Unchanged | Unchanged |
| Swords cycle | Unchanged | Unchanged |

### What Is NOT Changing

- The VS/Swords animation cycle and 5s/3s timing
- Arena Drawer contents and navigation
- Ring removal and text shrinking (from the approved plan)
- MobileVoteCenter replacement during active battles
- Video layout, action bars, name overlays

