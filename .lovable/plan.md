## Goal
On the home arena (`src/pages/Index.tsx`), there are currently two live sections that show overlapping content:
1. `🔥 Live Battles` (via `LiveBattleFeed`) — line 53-57
2. `LiveBarberStreams` — line 68 (battles + solo broadcasts)

User wants ONE unified "Lives" section that:
- Only renders when barbers are actually live (battles or solo broadcasts)
- Sits immediately above Official Gear (`ProductShelf`)
- Works on mobile / iPad / desktop

## Changes

### `src/pages/Index.tsx` (`UnifiedArena`)
- Remove the standalone `🔥 Live Battles` block (lines 53-57) and the bottom `<LiveBarberStreams />` placement (line 68).
- Drop the now-unused `LiveBattleFeed` import.
- Reorder so the new "Lives" section renders **immediately above** `<ProductShelf />` (Official Gear).

New section order in `UnifiedArena`:
```text
DynamicBattleHero
Lives (conditional)   ← NEW position
ProductShelf (Official Gear)
ArenaTicker
ImmersiveFactionBanners
GlobalLeagueDashboard
CommunitySection / GrantsSection
```

### `src/components/battles/LiveBarberStreams.tsx`
- Rename the section heading from its current label to **"Lives"** (keep the small pulsing red dot).
- Add an early `return null` when both `liveStreams` and `soloBroadcasts` are empty (and not loading) so the entire section — heading included — disappears when nothing is live.
- Keep all existing realtime invalidation + queries intact (single source of truth for "is anything live").

No other files touched. No backend, schema, or business-logic changes.

## Verification
- With zero live battles and zero solo broadcasts: section is fully hidden on `/`.
- With at least one live battle or solo broadcast: single "Lives" section renders directly above Official Gear on mobile (390px), iPad, and desktop.
- No duplicate live grid lower on the page.
