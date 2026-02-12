

## Fix Two-Barber Simultaneous Connection

### Root Causes Found

Three bugs prevent both barbers from connecting simultaneously:

**Bug 1: Wrong column name in edge function**
In `generate-battle-token/index.ts` line 223, the code uses:
```
[`barber${barberPosition}_streaming`]: true
```
But the actual database column is `barber1_is_streaming` / `barber2_is_streaming` (missing `_is_`). This means the streaming flag never gets set, so the system can't track who's connected.

**Bug 2: Status gate too narrow**
The edge function only updates battle status to "live" when status is `upcoming` or `scheduled` (line 218). But the battle is currently in `active` status. This means neither barber's streaming flag gets set and the battle never transitions to `live`.

**Bug 3: Twilio room not pre-created**
The `generate-battle-token` function only generates a JWT token -- it never creates the Twilio room. `Video.connect()` on the client relies on Twilio's "Ad-Hoc Room Creation" setting. If that's disabled in the Twilio console, the second barber can't join because the room doesn't exist. The `create-twilio-room` edge function exists but is never called in the current flow. The fix should ensure the room exists before returning the token.

**Bug 4 (minor): Duplicate stream sessions pile up**
Every connect attempt inserts a new `stream_sessions` row without cleaning up old ones for the same battle+barber. There are already 10+ stale "connecting" sessions for this one battle.

---

### Fix Plan

#### File: `supabase/functions/generate-battle-token/index.ts`

1. **Fix column name** (line 223): Change `barber${barberPosition}_streaming` to `barber${barberPosition}_is_streaming`

2. **Expand status gate** (line 218): Also update when status is `active` or `check_in`, not just `upcoming`/`scheduled`

3. **Create Twilio room if needed**: Before returning the token, call the Twilio REST API to create the room (or fetch it if it already exists). This ensures both barbers always have a valid room to join. Use the same `group` room type with 45-minute max duration.

4. **Upsert stream sessions**: Instead of blind insert, use upsert on `(battle_id, barber_id)` or delete old "connecting" sessions first to prevent stale records piling up.

#### File: `src/hooks/useBattleVideoRoom.tsx`

5. **Add retry on room-not-found**: If `Video.connect` fails with a "room not found" error, wait 2 seconds and retry once (covers the race where both barbers call generate-token simultaneously and the room creation hasn't propagated yet).

6. **Update battle streaming flag on successful connect**: After `Video.connect` succeeds, call `update-stream-status` to set the barber's `is_streaming` flag to true, providing a client-side fallback if the edge function update failed.

---

### Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `supabase/functions/generate-battle-token/index.ts` | Fix column name `_is_streaming` | Streaming flags actually get set |
| `supabase/functions/generate-battle-token/index.ts` | Expand status gate to include `active` | Battle transitions to `live` properly |
| `supabase/functions/generate-battle-token/index.ts` | Create Twilio room via REST API | Room guaranteed to exist for both barbers |
| `supabase/functions/generate-battle-token/index.ts` | Upsert/cleanup stream sessions | No more stale session records |
| `src/hooks/useBattleVideoRoom.tsx` | Retry on room-not-found | Handle race condition gracefully |
| `src/hooks/useBattleVideoRoom.tsx` | Update streaming flag on connect | Client-side fallback for status tracking |

### What Is NOT Changing

- ContenderTheater page layout and phase system -- untouched
- Presence/readiness system (useContenderReadiness) -- untouched
- BattleVideoContainer rendering -- untouched
- Twilio token generation (JWT creation) -- untouched
- All other edge functions -- untouched

