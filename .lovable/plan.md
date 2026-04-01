# Fix Live Stream Real-Time Updates, Cleanup, and Duplicate Cards

## Problems Identified

1. **Duplicate broadcast cards**: The same barber appears multiple times in the LIVE NOW section because multiple `stream_sessions` rows exist for the same barber (old sessions not cleaned up before creating new ones). The query fetches all `connecting`/`active` sessions without deduplication.
2. **No real-time updates on LiveBarberStreams**: The solo broadcasts query uses only `refetchInterval: 5000` with no Supabase Realtime subscription on `stream_sessions` or `barber_profiles`. When a stream ends, cards linger for up to 5 seconds.
3. **Viewer page doesn't react when stream ends**: `BroadcastViewer` fetches `is_live` once on mount but never re-checks. If the barber ends mid-view, the viewer sees "Waiting for stream..." forever instead of "Stream ended".
4. **Viewer count shows -1**: `room.numParticipants - 1` goes negative when the broadcaster hasn't connected yet. Needs `Math.max(0, ...)`.
5. **Stale sessions not cleaned on new broadcast**: `generate-broadcast-token` creates a new session without ending previous ones for the same barber. 
6. ensure users are able to donate like and comment its the full live view 

## Changes

### 1. Fix `generate-broadcast-token` — Clean Up Stale Sessions

**File: `supabase/functions/generate-broadcast-token/index.ts**`

Before creating a new `stream_sessions` row, update any existing `connecting`/`active` sessions for this user with `stream_type = 'solo_broadcast'` to `status = 'ended'`. This prevents duplicate cards.

### 2. Add Realtime Subscription to `LiveBarberStreams`

**File: `src/components/battles/LiveBarberStreams.tsx**`

Add a `useEffect` with a Supabase Realtime channel listening to:

- `stream_sessions` table for `INSERT`, `UPDATE`, `DELETE` events
- `barber_profiles` table for `UPDATE` events (is_live changes)

On any event, call `queryClient.invalidateQueries` for `['solo-broadcasts']` and `['live-barber-streams']`.

### 3. Deduplicate Solo Broadcasts Query

**File: `src/components/battles/LiveBarberStreams.tsx**`

After fetching solo broadcasts, deduplicate by `barber_id` — keep only the most recent session per barber.

### 4. Fix BroadcastViewer — React to Stream End

**File: `src/pages/BroadcastViewer.tsx**`

Add a Supabase Realtime subscription on `barber_profiles` filtered by `id=eq.{barberId}`. When `is_live` changes to `false`, set `error = 'Stream ended'` and disconnect.

### 5. Fix Viewer Count Going Negative

**File: `src/pages/BroadcastViewer.tsx**`

Change `room.numParticipants - 1` to `Math.max(0, room.numParticipants - 1)`.

### 6. Add Realtime to LiveNowBanner

**File: `src/components/battles/LiveNowBanner.tsx**`

Already has a Realtime subscription — good. No changes needed.

## File Summary


| File                                                   | Change                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `supabase/functions/generate-broadcast-token/index.ts` | End stale sessions before creating new one                       |
| `src/components/battles/LiveBarberStreams.tsx`         | Add Realtime subscription + deduplicate broadcasts by barber_id  |
| `src/pages/BroadcastViewer.tsx`                        | Add Realtime listener for stream end + fix negative viewer count |
