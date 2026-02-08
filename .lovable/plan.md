

# Dynamic Rotating Ticker Bar for Faction Banners

## Overview

Replace the static "Top Arenas / See who's dominating right now" header (lines 175-201 in `ImmersiveFactionBanners.tsx`) with a sleek, auto-rotating ticker bar that cycles through platform messages and sponsor ads every 5 seconds. Think of a sports broadcast ticker or social media "Stories" progress bar -- it keeps the section feeling alive and gives you a monetizable ad placement.

## What Gets Built

A new `ArenaTicker` component rendered in place of the current static header. It auto-rotates through an array of "slides" every 5 seconds, with smooth crossfade/slide-up transitions. Each slide can be one of three types:

| Slide Type | Example Content | Visual Style |
|---|---|---|
| **Platform Message** | "Battle Sunday is LIVE -- 45 barbers competing now" | Cyan glow text with pulse icon |
| **Stat Highlight** | "Prize pools hit $2,400 across 5 arenas" | Animated counter with fire icon |
| **Sponsor Ad** | "Powered by Wahl Pro -- Official Clippers of the Arena" | Sponsor logo + subtle "Sponsored" label |

### Visual Design

```text
+--------------------------------------------------------------+
| [===----] progress bar (thin, cyan, resets each 5s)          |
| [icon]  "Battle Sunday is LIVE -- 45 barbers competing"  [->]|
+--------------------------------------------------------------+
```

- **Height**: ~40px, compact single-line bar
- **Background**: Semi-transparent dark with subtle cyan border (matches platform aesthetic)
- **Progress indicator**: A thin animated bar at the top that fills over 5 seconds, then resets on slide change
- **Transition**: Slide-up + fade between messages using Framer Motion's `AnimatePresence`
- **Interactive**: Users can tap the bar to pause rotation; a small right arrow navigates to `/portal` or sponsor link
- **"See All" link**: Moves into the ticker as a periodic slide or remains as the arrow on the right side

### Slide Data

Slides are defined in a config array inside the component (easily swappable for a database/CMS source later). Initial set:

1. **"Top Arenas -- See who's dominating right now"** (retains the original message)
2. **"Battle Sunday is coming -- Register your faction now"**
3. **"$2,400+ in prize pools across 5 categories"** (can pull live data from `prizePools`)
4. **"Powered by [Sponsor Name] -- Official partner of the Arena"** (sponsor slot)
5. **"New: Creative Color category is trending with 12 barbers"** (dynamic stat)

## Technical Details

### New File: `src/components/factions/ArenaTicker.tsx`

A self-contained component with:

- **Props**: `prizePools` data (to show live stats), `isBarber` flag, `onNavigate` callback
- **State**: `activeIndex` (current slide), `isPaused` (hover/tap pause)
- **Timer**: `useEffect` with `setInterval(5000)` that increments `activeIndex`, wrapping around. Clears on unmount and pauses on hover
- **Slides array**: Mix of static messages and dynamic ones built from props (e.g., total prize pool sum)
- **Sponsor slides**: Marked with `type: 'sponsor'` to render a small "Ad" or "Sponsored" badge
- **Framer Motion**: `AnimatePresence` with `mode="wait"` for smooth crossfade between slides. Each slide uses `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -8 }}`
- **Progress bar**: A `motion.div` with `animate={{ scaleX: [0, 1] }}` over 5s duration, keyed to `activeIndex` so it resets each cycle
- **Click handler**: Tapping the bar navigates based on slide type (portal for platform messages, sponsor link for ads)
- **Dot indicators**: Tiny dots below the text showing which slide is active (like Instagram Stories)

### Modified File: `src/components/factions/ImmersiveFactionBanners.tsx`

- **Import** the new `ArenaTicker` component
- **Replace** the `motion.div` header block (lines 175-201) with `<ArenaTicker>`
- **Pass props**: `prizePools`, `isBarber`, and a navigation handler
- The "See All" functionality is absorbed into the ticker (one of the rotating slides or the persistent arrow)

### Styling Details

- Container: `bg-black/40 backdrop-blur-sm border border-cyan/20 rounded-lg px-4 py-2`
- Text: `text-xs sm:text-sm font-semibold text-foreground` with an icon on the left
- Progress bar: `h-0.5 bg-cyan/60 rounded-full` at the top of the container
- Sponsor badge: `text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded`
- Icons per slide type: `Flame` for stats, `Trophy` for prizes, `Megaphone` for announcements, sponsor logo placeholder for ads

### Slide Interface

```typescript
interface TickerSlide {
  id: string;
  type: 'message' | 'stat' | 'sponsor';
  text: string;
  icon: LucideIcon;
  link?: string;        // optional navigation target
  sponsorName?: string;  // only for sponsor type
  sponsorLogo?: string;  // optional logo URL
}
```

## Files to Create/Modify

| File | Action | Change |
|------|--------|--------|
| `src/components/factions/ArenaTicker.tsx` | **Create** | New rotating ticker component with 5s interval, progress bar, transitions |
| `src/components/factions/ImmersiveFactionBanners.tsx` | **Modify** | Replace static header (lines 175-201) with `<ArenaTicker>` component |

No database changes. No edge function changes. No new dependencies (uses existing Framer Motion and Lucide icons).

