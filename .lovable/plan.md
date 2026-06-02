## What I found

The false `Opponent connection lost` signal is most likely coming from a race in the contender room logic, not from the viewer room itself.

1. **`ContenderTheater` passes the wrong source of truth for the opponent identity**  
   It currently passes `opponentBarber?.id` from the `barber_profiles` query into `useBattleVideoRoom` (`src/pages/ContenderTheater.tsx`). That value can be temporarily `null` during initial load, refetches, or reconnect windows even when the battle row already knows both barber IDs.

2. **`useBattleVideoRoom` still has a legacy fallback that treats any remote participant as the opponent**  
   In `src/hooks/useBattleVideoRoom.tsx`, `isOpponent()` returns `true` for **every** remote participant when `expectedOpponentIdentity` is falsy. That means a viewer join/leave can still trigger:
   - `onOpponentJoin`
   - `onOpponentLeave`
   - remote track cleanup
   - the `Opponent connection lost` toast

3. **Auto-rejoin needs to be validated against the same room and the same barber pairing**  
   The reconnect loop is present, but it needs stricter guarding so it only reconnects the barber back into the same `battle-{id}` room and never tears down the session because of spectator churn.

## Plan

### 1) Lock opponent identity to the battle record
- In `src/pages/ContenderTheater.tsx`, derive the expected opponent LiveKit identity directly from `battle.barber1_id` / `battle.barber2_id`, not from `barberProfiles`.
- Do not allow the live connect flow to start until that opponent identity is known for an active 1v1 battle.
- Keep the displayed opponent name/profile separate from the identity used for LiveKit matching.

### 2) Remove the unsafe “any remote participant = opponent” fallback
- In `src/hooks/useBattleVideoRoom.tsx`, make opponent matching strict.
- If no explicit opponent identity is known, ignore remote participant events for opponent state instead of treating all remotes as the opponent.
- Preserve the last valid opponent identity during transient rerenders/requeries so it does not widen back to `null` mid-session.
- Ensure viewer joins/leaves never clear barber remote tracks or fire opponent-left toasts.

### 3) Harden rejoin behavior for real barber disconnects
- Keep the barber in `ContenderTheater` during transient LiveKit disconnects.
- Retry joining the same `battle-{id}` room with bounded backoff while the battle is still live and the session was not intentionally ended.
- Only navigate away after a confirmed unrecoverable reconnect failure.
- Verify that intentional end-stream and page exit still mark the stream ended correctly.

### 4) Test the exact failure cases before calling it fixed
- Add a focused regression test around the participant-classification logic in `useBattleVideoRoom` (or extract the matcher into a tiny testable helper).
- Validate these scenarios:
  1. **Barber A + Barber B + Viewer C** joins, then Viewer C leaves → no opponent-lost toast, no remote track teardown.
  2. Connect starts before profile data is fully hydrated → viewer churn still does not become the opponent.
  3. Barber B disconnects while Barber A stays live → Barber B auto-rejoins the same room successfully.
  4. Barber B tries to rejoin after the battle is truly over / other barber ended → reconnect stops gracefully.
- After the code change, re-check the preview behavior and the relevant function/runtime logs tied to reconnect.

## Technical details

**Primary files to update**
- `src/pages/ContenderTheater.tsx`
- `src/hooks/useBattleVideoRoom.tsx`
- one small regression test/helper file for the opponent-matching logic

**Expected result**
- Viewer churn no longer triggers `Opponent connection lost`
- Only the actual opposing barber controls opponent presence/track state
- A disconnected barber can rejoin while the other barber is still live in the same invitation room