

# Live Stream Feature — Full Architecture Plan

## Overview
Add a "Live Stream" option to the CameraStudio recording mode picker. When selected, the barber creates a solo LiveKit broadcast room. Any user (barber or fan, authenticated or not) can discover and watch active streams globally via the existing `LiveBarberStreams` component and a new dedicated viewer page.

## What Exists Today
- `CameraStudio.tsx` has a 4-option mode drawer (Portfolio, Challenge, Course, Tips)
- `barber_profiles` already has `is_live` (boolean) and `live_video_id` (string) columns
- `stream_sessions` table tracks LiveKit sessions (tied to `battle_id` currently)
- `generate-livekit-token` creates publisher tokens (currently battle-scoped)
- `get-livekit-viewer-token` creates subscriber tokens (currently battle-scoped, auth required)
- `LiveBarberStreams.tsx` shows live battles on the landing page
- `LiveKitArena.tsx` renders dual-stream battle views
- `platform_state` table stores key-value feature flags

## Changes Required

### 1. Database Migration
- Add `is_premium_streaming_enforced` row to `platform_state` with value `false`
- Make `stream_sessions.battle_id` nullable (it already is per types — confirm)
- Add `stream_type` column to `stream_sessions` (`'battle'` | `'solo_broadcast'`, default `'battle'`)

### 2. New Edge Function: `generate-broadcast-token`
Creates a LiveKit publisher token for solo broadcasts (no battle required):
- Authenticate the user, verify they have a barber profile
- Check `platform_state.is_premium_streaming_enforced` — if `true`, verify the barber has an active subscription tier
- Create a LiveKit room named `broadcast-{barber_profile_id}`
- Generate a publisher token with `canPublish: true`
- Insert a `stream_sessions` row with `stream_type: 'solo_broadcast'`, `battle_id: null`
- Set `barber_profiles.is_live = true`, `live_video_id = barber_profile_id`
- Return token + serverUrl + roomName

### 3. New Edge Function: `get-broadcast-viewer-token`
Creates a subscribe-only LiveKit token for ANY user (no auth required for public viewing):
- Accept `roomName` in the request body
- If auth header present, use user identity; otherwise generate anonymous viewer identity (`anon-{random}`)
- Verify the room exists by checking `stream_sessions` where `room_name = roomName` and `status = 'connecting' or 'active'`
- Generate a subscriber-only token (`canPublish: false`)
- Return token + serverUrl

### 4. New Edge Function: `end-broadcast`
Cleanly ends a solo broadcast:
- Authenticate user, verify they own the active stream session
- Update `stream_sessions` status to `'ended'`, set `ended_at`
- Set `barber_profiles.is_live = false`, `live_video_id = null`

### 5. Frontend: `useStreamingPermissions` Hook
```typescript
// src/hooks/useStreamingPermissions.tsx
// Queries platform_state for 'is_premium_streaming_enforced'
// If true, checks barber's active_subscription_tier
// Returns { canStream: boolean, isLoading: boolean, reason?: string }
```

### 6. Frontend: Update CameraStudio Mode Picker
- Add `StudioMode` type: `'idle' | 'portfolio' | 'challenge' | 'course' | 'tips' | 'livestream'`
- Add 5th option to `MODE_OPTIONS`: icon `Radio`, label "Live Stream", desc "Broadcast live to the Arena"
- In `handleModeSelect`, when `mode === 'livestream'`:
  - Check `useStreamingPermissions` — if denied, show toast and return
  - Call `generate-broadcast-token` edge function
  - On success, navigate to `/broadcast/{barber_profile_id}` passing token/serverUrl via route state

### 7. New Page: `BroadcastViewer.tsx` (`/broadcast/:barberId`)
A public page (no AuthGuard) that:
- Fetches barber profile info (name, avatar, country)
- Calls `get-broadcast-viewer-token` with `roomName: broadcast-{barberId}`
- Renders a single-stream LiveKit viewer using `@livekit/components-react` (`LiveKitRoom` + `VideoTrack`)
- Shows barber name overlay, live viewer count, and a chat/reaction area
- If the stream is offline, shows "This barber is not currently live"

### 8. New Page: `BroadcastStudio.tsx` (`/broadcast/:barberId/studio`)
A barber-only page (BarberGuard) that:
- Receives LiveKit token from route state (or re-fetches from `generate-broadcast-token`)
- Connects to LiveKit room as publisher
- Shows full-screen camera preview with stream controls (mute, video toggle, end stream)
- "End Stream" button calls `end-broadcast` edge function and navigates back to `/studio`

### 9. Update `LiveBarberStreams.tsx`
- Query `stream_sessions` where `stream_type = 'solo_broadcast'` AND `status IN ('connecting', 'active')`, joining `barber_profiles` for name/avatar
- Render solo broadcast cards alongside battle cards
- "Watch" button navigates to `/broadcast/{barberId}`

### 10. Route Registration (`App.tsx`)
- Add `/broadcast/:barberId` → `BroadcastViewer` (public, no guard)
- Add `/broadcast/:barberId/studio` → `BroadcastStudio` (AuthGuard + BarberGuard)

## File Summary

| Action | File |
|--------|------|
| Migration | Add `platform_state` row + `stream_type` column to `stream_sessions` |
| New | `supabase/functions/generate-broadcast-token/index.ts` |
| New | `supabase/functions/get-broadcast-viewer-token/index.ts` |
| New | `supabase/functions/end-broadcast/index.ts` |
| New | `src/hooks/useStreamingPermissions.tsx` |
| New | `src/pages/BroadcastViewer.tsx` |
| New | `src/pages/BroadcastStudio.tsx` |
| Edit | `src/pages/CameraStudio.tsx` — add livestream mode + routing |
| Edit | `src/components/battles/LiveBarberStreams.tsx` — include solo broadcasts |
| Edit | `src/App.tsx` — add broadcast routes |

## Technical Details

- Solo broadcasts use room name `broadcast-{barber_profile_id}` to avoid collision with battle rooms (`battle-{id}`)
- Viewer tokens for broadcasts do NOT require authentication — anonymous viewers get a generated identity
- The `is_premium_streaming_enforced` flag defaults to `false` (open access for launch)
- Supabase Realtime subscription on `stream_sessions` powers the live indicator on the landing page
- Stream sessions are cleaned up via the `end-broadcast` function and a future cron for stale sessions

