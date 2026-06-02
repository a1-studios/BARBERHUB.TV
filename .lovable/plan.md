## Goal
Remove the duplicate live section from the authenticated home screen and keep exactly one section named `Lives`, shown only when barbers are actually live, positioned immediately above Official Gear.

## What I found
The previous change only handled `LiveBarberStreams` in `src/pages/Index.tsx`.
The duplicate still appears because `src/components/GlobalLeagueDashboard.tsx` also renders `LiveBattleFeed`, which creates a second live block lower on the home page.

Current home path:
```text
Index
└─ UnifiedArena
   ├─ DynamicBattleHero
   ├─ LiveBarberStreams        ← intended single section
   ├─ ProductShelf
   ├─ ArenaTicker
   ├─ ImmersiveFactionBanners
   └─ GlobalLeagueDashboard
      └─ LiveBattleFeed        ← actual duplicate still showing
```

## Changes to make

### 1) `src/components/GlobalLeagueDashboard.tsx`
- Remove the embedded `<LiveBattleFeed />` block from this dashboard.
- Remove the now-unused `LiveBattleFeed` import.
- Keep the location search and map content unchanged.

Result: the dashboard stops reintroducing a second live section on the home page.

### 2) `src/pages/Index.tsx`
- Keep the single `<LiveBarberStreams />` placement directly above `<ProductShelf />`.
- Do not add any other live section here.

### 3) `src/components/battles/LiveBarberStreams.tsx`
- Keep the heading as `Lives`.
- Keep the existing conditional hide behavior when there are no active live battles or solo broadcasts.
- No query or backend changes unless inspection shows the visibility condition is wrong.

## Validation
After implementation I will verify:
- Mobile, iPad, and desktop home show only one live section.
- That section is named `Lives`.
- It sits immediately above Official Gear.
- When there are no active live battles or solo broadcasts, the section does not render.
- The lower duplicate from `GlobalLeagueDashboard` is gone.

## Technical notes
- No database or edge function changes.
- Frontend-only cleanup.
- Scope limited to the duplicate live rendering on the home screen.