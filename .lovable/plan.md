## Goal

Two issues from the screenshot:

1. The **125,000 BB prize ticker** renders twice on the home page (the duplicate you circled).
2. The **Lives** block still renders inline as a section; it should instead appear as an **auto-opening modal** that only triggers when there is at least one live barber.

## Changes

### 1. Remove the duplicate prize ticker
- File: `src/pages/Index.tsx` (in `UnifiedArena`)
- The `<ArenaTicker />` at lines 48–54 is rendered standalone, and `ImmersiveFactionBanners` (line 57) also renders its own `<ArenaTicker />` internally (line 179). That is the duplicate.
- Fix: delete the standalone `<ArenaTicker />` block in `Index.tsx` and the now-unused `ArenaTicker` / `useCategoryPrizePools` imports. Keep the ticker that lives inside `ImmersiveFactionBanners` (the lower one you chose to keep).

### 2. Convert Lives into an auto-opening modal
- New file: `src/components/battles/LivesModal.tsx`
  - Wraps the existing live-barbers grid inside a shadcn `Dialog`.
  - Opens automatically (once per session) whenever `liveStreams.length + soloBroadcasts.length > 0`.
  - Session flag `lives_modal_seen` prevents it from re-popping on every refetch.
  - Reopens when the live count transitions from 0 → ≥1 (a new barber goes live).
  - User can dismiss; while dismissed, a small floating "Lives (n)" pill in the bottom-right reopens it.
- File: `src/components/battles/LiveBarberStreams.tsx`
  - Extract the queries into a hook `useLiveContent()` returning `{ liveStreams, soloBroadcasts, hasContent }`.
  - Keep the existing card markup but render it inside the modal body instead of the page section.
- File: `src/pages/Index.tsx`
  - Replace `<LiveBarberStreams />` (line 42) with `<LivesModal />`.
- File: `src/components/fan/FanArenaView.tsx`
  - Same swap so both home variants behave the same.

### 3. Behavior contract
- When no barbers are live → no modal, no pill, no inline block (nothing rendered).
- When ≥1 barber is live → modal auto-opens once per session; afterwards the floating pill remains until live count returns to 0.
- Clicking a card inside the modal navigates to the broadcast/theater route (existing behavior preserved) and closes the modal.

## Out of scope
- No changes to the `LiveBarberStreams` queries themselves (the `is_live` + `isFreshLiveBroadcast` filter already gates accurately).
- No backend / RLS / edge function changes.
- No changes to faction banners or product shelf.

## Files touched
- `src/pages/Index.tsx` (remove duplicate ticker, swap Lives for modal)
- `src/components/fan/FanArenaView.tsx` (swap Lives for modal)
- `src/components/battles/LiveBarberStreams.tsx` (extract `useLiveContent`)
- `src/components/battles/LivesModal.tsx` (new)
