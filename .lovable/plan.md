# Fix live challenge disconnects and auto-rejoin

## Goal
Stop barber-vs-barber live challenge sessions from breaking when a viewer leaves, and let a disconnected barber automatically rejoin the same live invitation room while the other barber is still there.

## What I’ll change

1. **Harden the contender room hook**
   - Update `src/hooks/useBattleVideoRoom.tsx` so remote participant handling is keyed strictly to the opponent barber identity and never lets viewer churn affect the barber feed state.
   - Add proper room lifecycle handling for temporary network drops vs intentional exits.
   - Keep the local room session alive unless the barber explicitly ends the stream.

2. **Add automatic rejoin logic**
   - Add reconnect/rejoin behavior in `src/hooks/useBattleVideoRoom.tsx` with bounded retries and cleanup protection.
   - Reuse token fetch logic so a barber can reconnect to the same `battle-{id}` room if the connection drops but the battle is still live.
   - Preserve the current theater instead of kicking the barber back to `/watch` on transient disconnects.

3. **Fix contender theater disconnect behavior**
   - Update `src/pages/ContenderTheater.tsx` so room disconnects do not immediately navigate away during live mode.
   - Show reconnecting/waiting states while retrying, and only exit on an intentional end or a confirmed unrecoverable failure.

4. **Fix backend stream status updates**
   - Correct the contract mismatch between `useBattleVideoRoom` and `supabase/functions/update-stream-status/index.ts`.
   - The client is currently calling the function without the required `barberPosition`/`status` payload shape, and recent logs show `Not authorized` failures. I’ll align both sides so stream state updates are accurate and do not interfere with live room state.

5. **Validate the battle room/token flow**
   - Review `supabase/functions/generate-livekit-token/index.ts` to make sure rejoin remains allowed while the battle is live and the barber is one of the two participants.
   - Keep the invitation room stable for both barbers throughout reconnect attempts.

## Why this should fix it
The current flow treats disconnects too aggressively:
- the contender page sends barbers away on disconnect instead of recovering,
- the room hook does not implement a robust auto-rejoin path,
- and stream-status writes are failing in the backend, which can leave battle/session state inconsistent.

## Technical details
- Files to update:
  - `src/hooks/useBattleVideoRoom.tsx`
  - `src/pages/ContenderTheater.tsx`
  - `supabase/functions/update-stream-status/index.ts`
  - possibly `supabase/functions/generate-livekit-token/index.ts` if rejoin permissions need a small adjustment
- Validation after changes:
  - confirm no viewer leave triggers opponent-loss teardown
  - confirm transient disconnect retries reconnect into the same room
  - confirm barbers stay in theater during retry
  - confirm stream status writes succeed instead of returning `Not authorized`

## Evidence from the audit
- `ContenderTheater` currently navigates to `/watch` on disconnect during live mode.
- `useBattleVideoRoom` handles `RoomEvent.Disconnected`, but it does not implement a durable auto-rejoin path.
- Recent Supabase logs show `update-stream-status` failing with `Not authorized`.
- Recent `stream_sessions` rows are stuck in `connecting`, which matches the broken status update path.

If you approve, I’ll implement and validate this fix next.