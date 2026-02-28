

## Sponsor Slide: Bold Simple Fonts + Cyan Glow Border

### Changes

#### 1. `ArenaTicker.tsx` — Sponsor slide layout (lines 177-205)
- **Layout**: Change to vertical stack (`flex-col items-center gap-2`)
- **Logo**: Increase to `h-14 sm:h-16`, max-w `180px`
- **Replace `ColorfulText`** with a simple bold white `<span>` — `text-sm sm:text-base font-bold text-foreground tracking-wide`
- **SponsoredBadge**: On its own line below
- Increase container `min-h` from `72px` to `120px`

#### 2. `ArenaTicker.tsx` — Outer container (line ~131)
- Add a thin cyan glowing border: `border border-[hsl(var(--cyan))]/30 rounded-lg` with `box-shadow: 0 0 8px hsl(var(--cyan)/0.25), inset 0 0 4px hsl(var(--cyan)/0.1)` via inline style or a utility class

#### 3. `SponsoredBadge.tsx`
- Reduce font to `text-[8px] sm:text-[10px]`, padding to `px-2 py-0.5`

#### 4. Remove `ColorfulText` import (no longer used in this file)

