

## Live PK WebRTC Streaming Module — Implementation Plan

### Audit Summary

**Confirmed located and understood:**
- `SplitScreenBattle.tsx` — draggable 50/50 split with static `<video>` tags (will be replaced for live mode)
- `BattleTheater.tsx` — current theater uses `MP4Player` / `HLSVideoPlayer` for VOD. No live WebRTC rendering yet
- `generate-livekit-token` — already mints Publisher tokens for barbers, validates battle participation, awards show-up points, starts egress
- `get-livekit-viewer-token` — already mints Subscribe-only tokens for fans
- `useLiveKitStream.tsx` — barber-side hook for connecting/publishing (used by ContenderTheater)
- `TugOfWarMeter.tsx` — exists, accepts props, renders animated bar. Currently has no Data Channel listener
- `ProcessingArena.tsx` — exists, watches Realtime for `processing` → `voting` transition
- `donate-to-battle` edge function — delegates to `process_battle_donation` RPC (80/15/5 split). No Data Channel broadcast yet
- `close-battle-room` — already stops egress and transitions to `processing` via pg_cron
- `livekit-client` and `@livekit/components-react` — already in dependencies
- LiveKit secrets (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`) — already configured

**What's missing (this plan fills):**
- No `<LiveKitRoom>` rendering in BattleTheater for live battles
- No per-participant reconnection UI
- No server-authoritative countdown timer
- No Data Channel broadcast from `donate-to-battle`
- No Data Channel listener on the client
- BattleTheater doesn't distinguish live vs VOD rendering paths

---

### Step 1: `LiveKitArena` Component

New file: `src/components/battles/LiveKitArena.tsx`

A self-contained component that:
- Accepts `battleId`, `serverUrl`, `token`, `barber1Name`, `barber2Name`
- Wraps `<LiveKitRoom>` from `@livekit/components-react`
- Uses `useRemoteParticipants()` to find the two publisher tracks by identity (barber profile IDs)
- Renders a 50/50 split layout with each barber's `<VideoTrack>` / `<AudioTrack>`
- Per-side reconnection state: if a participant's `connectionQuality` drops or they disconnect, show "Reconnecting..." overlay on their half only — the other side stays live
- Mounts `TugOfWarMeter` at the bottom center, fed by Data Channel state
- Mounts `ServerBattleTimer` at the top center

---

### Step 2: `ServerBattleTimer` Component

New file: `src/components/battles/ServerBattleTimer.tsx`

- Reads `battles.ends_at` from the query cache (already fetched in BattleTheater)
- Computes remaining seconds as `ends_at - Date.now()` (ISO timestamp comparison)
- Renders MM:SS countdown with spring animation
- When timer hits 0, calls `onTimeUp()` callback
- Does NOT use `setInterval` from device clock — re-derives from `ends_at` each tick to prevent drift

---

### Step 3: Update `BattleTheater.tsx`

Add a live/VOD rendering branch:

```
if (battle.status === 'processing') → render ProcessingArena
if (battle.status === 'live') → render LiveKitArena (request viewer token, connect)
else → render existing MP4/HLS VOD playback
```

For `live` status:
- Call `get-livekit-viewer-token` on mount (fan path) or `generate-livekit-token` if user is a participant
- Pass token + serverUrl to `LiveKitArena`
- When `ServerBattleTimer` fires `onTimeUp`, disconnect from LiveKit room and show `ProcessingArena`
- Subscribe to Supabase Realtime on `battles` table for status changes (handle admin-triggered transitions)

---

### Step 4: Data Channel Broadcast in `donate-to-battle`

Update: `supabase/functions/donate-to-battle/index.ts`

After the `process_battle_donation` RPC succeeds:
1. Query current donation totals for both barbers from `battle_donations`
2. Use `RoomServiceClient.sendData()` to broadcast to room `battle-{battle_id}`:
```json
{
  "type": "donation",
  "barber_id": "...",
  "amount": 50,
  "donor": "FanName",
  "total_b1": 320,
  "total_b2": 180
}
```
3. Encode as `TextEncoder.encode(JSON.stringify(payload))`
4. Non-fatal: if LiveKit broadcast fails, the donation still succeeds

---

### Step 5: Data Channel Listener in `LiveKitArena`

Inside the `LiveKitArena` component:
- Use `useRoomContext()` to get the Room instance
- Listen on `RoomEvent.DataReceived` for payloads where `type === 'donation'`
- Parse `total_b1` and `total_b2` from the payload
- Update local state that feeds `TugOfWarMeter` props
- **No optimistic updates** — the meter only moves when a confirmed server payload arrives

---

### Step 6: Phase Transition on Timer End

When `ServerBattleTimer` fires `onTimeUp`:
1. Disconnect the LiveKit room (call `room.disconnect()`)
2. Set local state to `'processing'`
3. Render `ProcessingArena` (already built — watches Realtime for `voting` transition)
4. The server-side `close-battle-room` pg_cron job handles the actual room cleanup and status transition

---

### Files Summary

| Action | File |
|--------|------|
| Create | `src/components/battles/LiveKitArena.tsx` |
| Create | `src/components/battles/ServerBattleTimer.tsx` |
| Update | `src/pages/BattleTheater.tsx` (live/VOD branch, viewer token, phase transitions) |
| Update | `supabase/functions/donate-to-battle/index.ts` (Data Channel broadcast) |

### No changes needed to:
- `generate-livekit-token` — already mints Publisher tokens with show-up points
- `get-livekit-viewer-token` — already mints Subscribe-only tokens
- `ProcessingArena` — already built and functional
- `close-battle-room` — already handles egress stop and status transition
- `TugOfWarMeter` — already built, accepts props (no Data Channel logic inside it)

