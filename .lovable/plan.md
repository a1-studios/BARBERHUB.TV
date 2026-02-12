

## Transform VS into Pulsing Swords Battle Gateway for Barbers

### Concept

The VS divider already pulses with a lightning flash every 3 seconds. For barbers, we replace that cycle: the VS text cross-fades to a **pulsing Swords icon** for 3 seconds, then back to VS, repeating. No cursor change -- the Swords pulse itself is the visual cue. When a barber taps it, a bottom Drawer opens with battle options. Fans see the original VS animation unchanged.

### Animation Cycle (Barbers Only)

```text
0s-5s:    "VS" text (normal lightning flash animation)
5s-8s:    Swords icon fades in, pulses with glow, "ENTER" label appears
8s:       Cross-fade back to "VS"
          (repeat)

On tap during either state --> opens Arena Drawer
```

### Changes

#### File: `src/components/DynamicBattleHero.tsx`

**New imports:**
- `useUserRole` hook
- `Swords`, `Flame`, `Target`, `ChevronRight` from lucide-react
- `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle` from vaul
- `AnimatePresence` from framer-motion

**New state:**
- `arenaDrawerOpen` (boolean) -- controls the Drawer
- `showSwords` (boolean) -- toggles between VS and Swords display in a 8s cycle (5s VS, 3s Swords)

**New effect (barbers only):**
- `useEffect` with `setInterval` that flips `showSwords` between false/true on a 5s/3s alternating schedule

**Modify VS container (lines 315-356):**
- Wrap entire container in a `<button>` (no visual cursor change) with `onClick={() => setArenaDrawerOpen(true)}` -- only for barbers
- Inside, use `AnimatePresence mode="wait"` to cross-fade between:
  - **VS state**: The existing `motion.span` with "VS" text and lightning animation (unchanged)
  - **Swords state**: A `motion.div` containing the Swords icon (w-6 h-6) with a pulsing scale+glow animation and a tiny "ENTER" label below it in cyan
- The rotating rings remain unchanged and always visible
- For fans (non-barbers), render the original VS only -- no button wrapper, no Swords cycle

**Add Drawer (after the VS block):**
- Renders only for barbers
- Contains two rows:
  1. **Battle** (Swords icon, orange accent) -- navigates to `/portal` which has the ChallengeFeed with open challenges to accept
  2. **Issue Challenge** (Flame icon, red accent) -- navigates to `/portal` with the IssueChallenge form

Each row: icon + title + short description + chevron, styled with dark card background matching existing theme.

**New query (barbers only):**
- Fetch count of open challenges from `open_challenges` table with `status = 'open'` to show a badge count on the "Battle" row

### What the Barber Sees

```text
Default (5 seconds):
  [rotating dashed ring]
     [inner glow ring]
         VS            <-- normal lightning flash
  
Swords phase (3 seconds):
  [rotating dashed ring]
     [inner glow ring]
      [Swords icon]    <-- pulsing scale 1.0-1.2, cyan glow
       ENTER           <-- tiny label, fades in

Tap anywhere on the circle:
  +----------------------------------+
  |  ENTER THE ARENA                 |
  |                                  |
  |  [Swords] Battle            (3)  |
  |  Accept open challenges     -->  |
  |                                  |
  |  [Flame]  Issue Challenge        |
  |  Challenge any barber       -->  |
  +----------------------------------+
```

### Summary

| Area | Change | Purpose |
|------|--------|---------|
| VS text (barbers) | 5s/3s cycle: VS cross-fades to pulsing Swords + "ENTER" | Visual battle gateway cue |
| VS container (barbers) | Wrapped in tappable button (no cursor change) | Opens arena drawer |
| New Drawer | 2 rows: Battle (challenges feed) + Issue Challenge | Express arena navigation |
| Open challenges count | Badge on Battle row | Show available battles |
| Fan experience | Completely unchanged | No regression |

### What Is NOT Changing

- VS design for fans -- identical to current
- Rotating ring animations -- preserved
- Lightning flash timing -- preserved during VS phase
- MobileVoteCenter replacement during active battles -- untouched
- DynamicBattleHero layout, video sections, action bars -- untouched
- No new files created -- all changes in DynamicBattleHero.tsx

