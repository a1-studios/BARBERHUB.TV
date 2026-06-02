# Plan: Consistent Live/Challenge Visibility

## Problem
1. Live/challenge state isn't reliably reflected on barber avatars across the app — some accounts/views don't show the LIVE ring, while others do.
2. The "live ring" around the profile picture is inconsistent (different components compute "live" differently — some only read `barber_profiles.is_live`, others check `battles.status`, others check `last_live_check` freshness).
3. Tapping a barber's avatar/profile doesn't reliably take a viewer into the active stream or challenge.
4. There's no dedicated destination — like `/watch` — for browsing live streams and active challenges.

## Goals
- Single source of truth for "is this barber live right now (solo broadcast OR in a battle/challenge)".
- One reusable `LiveAvatar` indicator used everywhere a barber avatar appears.
- Tap-to-join: clicking a live avatar deep-links to the right destination (battle theater / broadcast viewer / challenge room).
- New `/live` route — a Watch-style hub showing only live broadcasts and active challenges.

## Scope

### 1. Unified live-state hook
Add `src/hooks/useBarberLiveState.tsx` returning, for one or many `barber user_id`s:
```
{ isLive: boolean, kind: 'broadcast' | 'battle' | 'challenge' | null,
  destination: string | null, battleId?, videoId? }
```
Logic (priority order, with freshness check using existing `src/lib/liveBroadcast.ts`):
1. Active battle/challenge — `battles` row with `status in ('voting','live')` and barber as `barber1_id`/`barber2_id` → destination `/battle/:id/theater`.
2. Solo broadcast — `barber_profiles.is_live = true` AND fresh `last_live_check` → destination `/broadcast/:barberId`.
3. Otherwise not live.

Backed by:
- One realtime subscription to `battles` + `barber_profiles` updates (scoped to the ids requested).
- A small React Query cache so cards, headers, and rails share data.

### 2. Reusable `LiveAvatar` component
`src/components/barber/LiveAvatar.tsx` wrapping `Avatar` + `TierRing`:
- Adds the pulsing red ring + "LIVE" / "BATTLE" / "CHALLENGE" micro-badge based on `kind`.
- Click handler navigates to `destination` (or falls back to profile if not live).
- Replaces ad-hoc live styling in: `BarberProfileCard`, `LiveBattleFeed`/`BattleCard`, `NearbyBarberCard`, `BarberMapDirectory` pins, `DynamicBattleHero`, `Header` user menu, `WatchFeed` overlays, `NotificationPanel`, `LiveBarberStreams`.

### 3. Live Hub page (`/live`)
New `src/pages/LiveHub.tsx` + route in `src/App.tsx`:
- Top section: **Live Now** — grid/rail of solo barber broadcasts (uses unified hook).
- Below: **Active Challenges & Battles** — cards for in-progress `battles` (voting/live), with VS layout, vote counters, "Join" CTA.
- Realtime updates as streams start/end.
- Mobile-first, matches Watch aesthetic (deep black + neon-orange accents per design memory).

### 4. Navigation
- Add a "Live" entry to `BottomNavBar` next to Watch (icon: pulsing dot).
- Update `QuickActionsMenu` to surface "Go Live Hub" link.
- `LiveMatchCounter` badge links to `/live` instead of `/creator-hub`.

### 5. Consistency cleanup
Replace these per-file "live" checks with the new hook:
- `BarberProfileCard` (uses raw `is_live`)
- `BarberPublicProfile` (raw `is_live`)
- `BarbersDirectory`, `LiveBarberStreams`, `BattleCard`
- `useFollowedBarbersNotifications` (so notifications fire on any live kind)

No backend schema changes — `barber_profiles.is_live`, `last_live_check`, and `battles.status` already exist; we're only unifying how the client reads them.

## Technical notes
- Realtime: one shared channel `live-state` subscribing to `barber_profiles` (`is_live`, `last_live_check`) and `battles` (`status`) — components subscribe via the hook, not directly.
- Freshness: reuse `isFreshLiveBroadcast` from `src/lib/liveBroadcast.ts` to ignore stale `is_live=true` rows where the heartbeat died.
- Click routing precedence ensures a barber in a battle goes to the battle theater (not their solo broadcast page).
- No changes to LiveKit session logic, economy, or RLS.

## Files
- New: `src/hooks/useBarberLiveState.tsx`, `src/components/barber/LiveAvatar.tsx`, `src/pages/LiveHub.tsx`
- Edited: `src/App.tsx`, `src/components/BottomNavBar.tsx`, `src/components/QuickActionsMenu.tsx`, `src/components/tournament/LiveMatchCounter.tsx`, `src/components/barber/BarberProfileCard.tsx`, `src/pages/BarberPublicProfile.tsx`, `src/components/battles/BattleCard.tsx`, `src/components/battles/LiveBarberStreams.tsx`, `src/pages/BarbersDirectory.tsx`, `src/hooks/useFollowedBarbersNotifications.tsx`

## Verification
- Start a battle → both barbers' avatars across feed, directory, header all show LIVE ring; clicking any goes to `/battle/:id/theater`.
- Solo barber goes live → same avatars show LIVE ring → `/broadcast/:barberId`.
- Barber heartbeat stops → ring disappears within `LIVE_BROADCAST_STALE_MS`.
- `/live` lists both broadcasts and active battles, updates in realtime.
