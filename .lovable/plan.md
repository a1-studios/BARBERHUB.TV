

## Goal
Replace the fixed 50/50 mobile split with a **draggable divider** so viewers can resize each barber's video independently — drag up = give barber 2 more space, drag down = give barber 1 more space, or fully expand either to fullscreen.

## Current State
`BattleTheater.tsx` (live phase via `LiveKitArena.tsx` and VOD phase) uses `flex-col md:flex-row` with hard `flex-1` on each side → equal halves, no resize.

## Approach
Use `react-resizable-panels` (already in deps via `src/components/ui/resizable.tsx`) wrapped by a small custom mobile-friendly component. On mobile (vertical stack) the handle is a horizontal grab-bar; on desktop (side-by-side) it's vertical.

### New file: `src/components/battles/DraggableBattleSplit.tsx`
Thin wrapper around `ResizablePanelGroup`:
- `direction="vertical"` on mobile, `"horizontal"` on desktop (via `useIsMobile`)
- Two `ResizablePanel`s, each `defaultSize={50} minSize={15}` (allow near-fullscreen of either side, but not zero so the handle stays grabbable)
- `ResizableHandle withHandle` styled prominently: 
  - Mobile: full-width 6px tall bar with center grip dots (white/30 bg, white/80 dots, larger touch target ~24px hit area via padding)
  - Desktop: 4px wide, vertical grip
- Double-tap/click handle → reset to 50/50

### Edit: `src/pages/BattleTheater.tsx`
The VOD/voting layout currently at lines ~360-450 (the `h-full flex flex-col md:flex-row` block with two video tiles):
- Replace the outer flex container with `<DraggableBattleSplit>`
- Move each video tile into its respective `panelOne` / `panelTwo` slot

### Edit: `src/components/battles/LiveKitArena.tsx`
Same swap for live phase: replace the `flex-1 flex flex-col md:flex-row` participants container with `<DraggableBattleSplit>`, putting `renderParticipantSide(p1, ...)` and `renderParticipantSide(p2, ...)` into the two panels.

## Files Touched
| File | Change |
|---|---|
| `src/components/battles/DraggableBattleSplit.tsx` | **NEW** — responsive draggable two-panel wrapper with prominent grip handle, double-tap reset |
| `src/pages/BattleTheater.tsx` | Wrap VOD two-video block in `<DraggableBattleSplit>` |
| `src/components/battles/LiveKitArena.tsx` | Wrap live two-participant block in `<DraggableBattleSplit>` |

## Result
- Mobile portrait: viewers can drag the horizontal grip up/down to expand either barber to nearly fullscreen at any time, in both live and VOD phases.
- Desktop: same behavior, vertical drag bar between the two sides.
- Default 50/50 — feels identical until the user grabs the handle.
- Double-tap the handle snaps back to 50/50.
- Works across the entire battle lifecycle (live LiveKit + VOD playback).

