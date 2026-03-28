

# LiveKit WebRTC Integration & Feed Content Separation

## Summary

This plan addresses three areas: (1) separating content types so only battle/VS videos use the 50/50 split screen while portfolio/educator content plays in the theater player, (2) making all videos loop continuously, and (3) completing the LiveKit real-time infrastructure with device management and Data Channel donation broadcasting.

---

## Part 1: Feed Content Separation & Looping

### Problem
Currently the WatchFeed interleaves battles into the same feed as portfolio/educator videos, and battles render via `SplitScreenBattle`. This is correct — but individual battle submissions (non-VS content from `battle_submissions` table) also appear as standalone `video` type items. Additionally, no videos loop.

### Changes

**File: `src/pages/WatchFeed.tsx`**
- Add `loop` attribute to the `<video>` element in `renderVideoItem` (line 264) so portfolio/educator/platform videos loop endlessly
- Remove the `onEnded` handler and the replay overlay logic — videos now loop automatically
- Clean up `endedVideos` state and `handleVideoEnded`/`handleReplay` callbacks (no longer needed)

**File: `src/components/battles/SplitScreenBattle.tsx`**
- Videos already have `loop` attribute — confirmed, no change needed

**File: `src/components/BrandedVideoPlayer.tsx`**
- Add `loop` prop (default `true`) to the `<video>` element so all branded player instances loop by default
- When `loop` is true, suppress the `onEnded` callback

**File: `src/pages/BattleTheater.tsx`**
- VOD phase MP4 players (line 32, 346, 384): add `loop` to `<video>` elements so battle replays loop continuously

---

## Part 2: Pre-Join Device Management

### Problem
The ContenderTheater preview phase starts the camera but has no UI to switch between front/rear cameras or test audio levels.

### Changes

**File: `src/hooks/useLocalCameraPreview.tsx`**
- Add `switchCamera()` function that stops the current video track, re-calls `getUserMedia` with `facingMode: 'environment'` (toggling between `'user'` and `'environment'`)
- Track current `facingMode` in state
- Expose `switchCamera` and `facingMode` from the hook

**File: `src/pages/ContenderTheater.tsx`**
- During `preview` phase, render a camera switch button (flip icon) in the overlay area
- Wire it to `switchCamera()` from `useLocalCameraPreview`
- This integrates naturally with the existing `ContenderPreviewOverlay` and `ContenderControlBar`

**File: `src/components/contender/ContenderControlBar.tsx`**
- Add a camera flip button (visible only during preview/standby phases) that calls the new `switchCamera` prop

---

## Part 3: LiveKit Data Channel Donation Broadcast

### Current State (Already Implemented)
- **`donate-to-battle` edge function** (lines 56-115): Already queries LiveKit credentials, sums donation totals, and broadcasts a JSON payload via `RoomServiceClient.sendData()` — this is fully wired
- **`LiveKitArena` component** (lines 44-61): Already listens for `RoomEvent.DataReceived`, parses the JSON, and updates `donationTotals` state
- **`TugOfWarMeter` component**: Already renders from props, never updates optimistically — it only shifts when `donationTotals` state changes from the Data Channel event

### Verification needed
The `donate-to-battle` edge function queries `battle_donations.recipient_barber_id` (line 81) but the `process_battle_donation` RPC inserts into `battle_donations` with column `barber_id`, not `recipient_barber_id`. This column name mismatch would cause the totals query to return 0 for both barbers.

### Changes

**File: `supabase/functions/donate-to-battle/index.ts`**
- Fix the donation totals query: change `recipient_barber_id` to `barber_id` (line 75) to match the actual column name used by the `process_battle_donation` RPC
- This is the critical bug preventing the Tug-of-War meter from updating during live battles

---

## Part 4: LiveKit Secrets Verification

The edge functions reference three secrets: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`. These must exist in Supabase Edge Function secrets. Will verify before implementation and prompt if missing.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/WatchFeed.tsx` | Add `loop` to videos, remove replay overlay logic |
| `src/components/BrandedVideoPlayer.tsx` | Add `loop` prop (default true) |
| `src/pages/BattleTheater.tsx` | Add `loop` to VOD MP4 players |
| `src/hooks/useLocalCameraPreview.tsx` | Add `switchCamera()` with facingMode toggle |
| `src/pages/ContenderTheater.tsx` | Wire camera switch button in preview phase |
| `src/components/contender/ContenderControlBar.tsx` | Add camera flip button for preview/standby |
| `supabase/functions/donate-to-battle/index.ts` | Fix `recipient_barber_id` → `barber_id` column reference |

