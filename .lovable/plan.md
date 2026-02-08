

# ArenaTicker Redesign: Sponsor Ad Showcase with Prize Pool Anchor

## Overview

Rebuild the ArenaTicker as a dedicated **sponsor ad rotation system**. The dynamic total prize pool (e.g., "$25,000 IN PRIZES") becomes the **anchor slide** that plays between every sponsor ad, creating a repeating pattern:

```text
Prize Pool -> Sponsor Ad 1 -> Prize Pool -> Sponsor Ad 2 -> Prize Pool -> Sponsor Ad 3 -> ...
```

Every sponsor gets equal screen time, and the prize pool acts as a branded "bumper" that resets user attention between ads -- just like a TV broadcast returning to the score ticker between commercial breaks.

## Rotation Pattern

With 4 sponsor ads configured, the sequence looks like this (each slide holds for 5 seconds):

| Second | Slide |
|--------|-------|
| 0-5 | **$18,750+ IN PRIZES** (animated counter rolls up) |
| 5-10 | Wahl Pro -- Official Clippers of the Arena |
| 10-15 | **$18,750+ IN PRIZES** |
| 15-20 | Andis -- Precision Tools for Champions |
| 20-25 | **$18,750+ IN PRIZES** |
| 25-30 | BabylissPRO -- Power Behind the Fade |
| 30-35 | **$18,750+ IN PRIZES** |
| 35-40 | Barber Strong -- Built for the Arena |
| 40+ | *Cycle repeats from Sponsor 1* |

The prize pool slide always shows first on mount with the animated counter rolling up from $0 to the current total. On subsequent appearances it displays instantly (no re-animation).

## Visual Design

### Prize Pool Slide (Anchor)

```text
+================================================================+
| [===-------] progress bar (cyan-to-orange gradient)            |
|                                                                |
|   [Trophy]   $18,750+  IN PRIZES                              |
|                                                                |
|   [dot] [dot] [dot] [dot] [dot] [dot] [dot] [dot] [dot]       |
+================================================================+
```

- Trophy icon on the left in cyan with glow
- Dollar amount in large bold text (`text-base sm:text-lg lg:text-xl font-extrabold`) with gradient text (cyan-to-white)
- "IN PRIZES" label in smaller uppercase tracking text
- No "Sponsored" badge on this slide

### Sponsor Ad Slide

```text
+================================================================+
| [===-------] progress bar                                      |
|                                                                |
|   [Megaphone]  "Powered by Wahl Pro -- Official..."  [Sponsored]|
|                                                                |
|   [dot] [dot] [dot] [dot] [dot] [dot] [dot] [dot] [dot]       |
+================================================================+
```

- Megaphone icon (or custom per sponsor) in muted foreground color
- Sponsor message text in `text-xs sm:text-sm font-semibold`
- "Sponsored" pill badge on the right
- Clicking navigates to sponsor link (if provided)

## Technical Details

### File: `src/components/factions/ArenaTicker.tsx`

**Sponsor data array**: Replace the current mixed `slides` array with a clean sponsor-only list. Each sponsor is defined as:

```typescript
interface SponsorSlide {
  id: string;
  name: string;
  message: string;
  icon: LucideIcon;
  link?: string;
}
```

Initial sponsors (hardcoded, easily swappable for database later):
1. Wahl Pro -- "Official Clippers of the Arena"
2. Andis -- "Precision Tools for Champions"
3. BabylissPRO -- "Power Behind the Fade"
4. Barber Strong -- "Built for the Arena"

**Interleaving logic**: Build the actual display sequence by interleaving prize pool slides between each sponsor:

```typescript
// Build interleaved sequence: [prize, sponsor1, prize, sponsor2, ...]
const displaySlides = sponsors.flatMap(sponsor => [
  { type: 'prize-pool' as const, id: `prize-before-${sponsor.id}` },
  { type: 'sponsor' as const, ...sponsor },
]);
```

This creates an array of length `sponsors.length * 2`. The `activeIndex` cycles through this interleaved array.

**Animated prize counter**: On the prize pool slide, render the total prize pool amount with a roll-up animation on first mount:
- Use `requestAnimationFrame` counting loop (same pattern as existing `AnimatedCounter` component)
- Track `hasAnimated` ref so the counter only rolls up once (on first appearance), then displays the value instantly on subsequent cycles
- Format as currency using the existing `formatCurrency` helper

**Dot indicators**: Show one dot per actual position in the interleaved array. Since there are `sponsors.length * 2` positions, with 4 sponsors that's 8 dots. Prize pool dots use cyan color, sponsor dots use muted foreground -- this visually communicates the alternating pattern.

**Container styling**: Keep the existing dark glass container (`bg-black/40 backdrop-blur-sm border border-cyan/20 rounded-lg`). Increase vertical padding slightly (`py-3` instead of `py-2.5`) for the prize pool slide to give the larger text room to breathe. Min-height increases to `min-h-[48px]` to prevent layout shift between the two slide types.

**Progress bar**: Keep the existing 5-second filling progress bar, keyed to `activeIndex` so it resets on each slide transition.

**Pause on hover**: Keep existing behavior -- hovering pauses the rotation, leaving pauses it again.

**Click behavior**: 
- Prize pool slides navigate to `/portal`
- Sponsor slides navigate to `sponsor.link` if provided, otherwise no-op

### Removed Content

The following slides are removed entirely (they are not sponsor ads and dilute the purpose):
- "Top Arenas -- See who's dominating right now" (platform message)
- "Battle Sunday is coming -- Register your faction now" (platform message)
- "X barbers competing across all categories" (stat)
- The old prize pool stat slide (replaced by the dedicated anchor slide)

### File: `src/components/factions/ImmersiveFactionBanners.tsx`

No changes needed. It already passes `prizePools`, `isBarber`, and `onNavigate` to `ArenaTicker`.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/factions/ArenaTicker.tsx` | Full rewrite: sponsor-focused rotation with prize pool anchor, interleaved sequence, animated counter, updated visuals |

No new files. No database changes. No edge functions. No new dependencies.
