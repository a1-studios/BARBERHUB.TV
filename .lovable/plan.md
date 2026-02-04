
# Contender Theater: Camera Preview & Standby Room

## Overview

Transform the ContenderTheater from a "click to connect" experience into a proper pre-battle staging experience where:
1. **Camera Preview**: Barber sees their camera immediately on page load (before going live) so they can adjust lighting, framing, and audio
2. **Standby Room**: Both barbers are in a "green room" waiting area where they can see when the opponent is ready
3. **Ready Check**: Both barbers must signal "READY" before the battle can officially begin

---

## Current vs. Desired Flow

```text
CURRENT FLOW:
┌─────────────────────────────────────────────────────────────────┐
│ ContenderTheater loads → "Click GO LIVE to start broadcasting" │
│                                                                 │
│   [Empty camera placeholder]  VS  [Waiting for opponent...]    │
│                                                                 │
│              Click "GO LIVE" → Twilio connect()                 │
│              Camera starts + joins room simultaneously          │
└─────────────────────────────────────────────────────────────────┘


DESIRED FLOW (3 Phases):
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: CAMERA PREVIEW (On page load)                          │
│                                                                 │
│  ┌──────────────────────────────┐    ┌────────────────────────┐ │
│  │   YOUR CAMERA PREVIEW        │ VS │  Opponent not here yet │ │
│  │   [Live camera feed]         │    │  [Waiting status]      │ │
│  │                              │    │                        │ │
│  │   🎤 Mic ✓  📹 Video ✓       │    │  ○ NOT READY           │ │
│  │   Adjust your lighting!      │    │                        │ │
│  └──────────────────────────────┘    └────────────────────────┘ │
│                                                                 │
│              [Mic] [Video] [I'M READY] [Settings] [Chat]        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (User clicks "I'M READY")
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: STANDBY ROOM (Both barbers in green room)              │
│                                                                 │
│  ┌──────────────────────────────┐    ┌────────────────────────┐ │
│  │   YOUR CAMERA                │ VS │  OPPONENT'S CAMERA     │ │
│  │   [Camera feed]              │    │  [Camera feed]         │ │
│  │                              │    │                        │ │
│  │   ✓ READY                    │    │  ✓ READY               │ │
│  └──────────────────────────────┘    └────────────────────────┘ │
│                                                                 │
│      Both barbers ready!                                        │
│             [START BATTLE IN 5... 4... 3... 2... 1...]         │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Countdown completes)
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: LIVE BATTLE                                            │
│                                                                 │
│  ┌────────────────────────┐ VS ┌────────────────────────┐       │
│  │   50/50 SPLIT          │    │   LIVE STREAMING       │       │
│  │   [Your stream]        │    │   [Opponent stream]    │       │
│  └────────────────────────┘    └────────────────────────┘       │
│                                                                 │
│      🔴 LIVE   👁 1,234 viewers   ⏱ 12:34                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Design

### Phase States

| Phase | Camera | Twilio Room | Opponent Visible | Controls |
|-------|--------|-------------|------------------|----------|
| **preview** | Local preview (getUserMedia) | Not connected | No (waiting indicator) | Ready button, mic/video toggle |
| **standby** | Local + realtime presence | Connected | Yes (via presence) | Both must be ready |
| **live** | Full Twilio P2P | Connected | Yes (video tracks) | End stream, chat |

### New Hook: useContenderReadiness

Track barber presence and readiness via Supabase Realtime Presence:

```tsx
interface ContenderPresence {
  barber_id: string;
  user_id: string;
  display_name: string;
  country_code: string;
  is_ready: boolean;
  has_camera: boolean;
  joined_at: string;
}

const useContenderReadiness = (battleId: string, barberPosition: 1 | 2) => {
  // Track own presence + ready status
  // Listen for opponent's presence
  
  return {
    localReady,
    opponentReady,
    opponentPresence,
    isOpponentPresent,
    setReady,
    bothReady,
  };
};
```

### New Hook: useLocalCameraPreview

Start camera preview WITHOUT connecting to Twilio:

```tsx
const useLocalCameraPreview = () => {
  // Request camera/mic access
  // Return stream for local preview only
  // Toggle video/audio locally
  // Cleanup on unmount
  
  return {
    stream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    startPreview,
    stopPreview,
    isPreviewActive,
    error,
  };
};
```

### Modified useBattleVideoRoom

Add a "connect on demand" pattern rather than immediate connection:

```tsx
// Current: connect() starts camera AND joins room
// New: camera is already running from preview, just join room
const connect = async (existingStream?: MediaStream) => {
  // Use existingStream if provided (from preview)
  // Or create new one if not
  // Then connect to Twilio room
};
```

---

## UI Components

### New: ContenderPreviewOverlay

Shows camera adjustments tips and ready status:

```tsx
const ContenderPreviewOverlay = ({ 
  phase,
  isReady,
  opponentReady,
  opponentName,
  isOpponentPresent,
  onReady,
  countdown
}) => {
  // Phase: preview - Show "Adjust your camera" tips + Ready button
  // Phase: standby - Show readiness status for both
  // Phase: countdown - Show 5-4-3-2-1 countdown
  // Phase: live - Minimal overlay
};
```

### Modified: ContenderControlBar

Add "I'M READY" button that replaces "GO LIVE" in preview phase:

```tsx
// Preview phase: [Mic] [Video] [I'M READY] [Chat] [Settings]
// Standby phase: [Mic] [Video] [WAITING...] or [BOTH READY - STARTING] [Chat] [Settings]
// Live phase: [Mic] [Video] [END] [Chat] [Settings] (existing)
```

### Modified: BattleVideoContainer

Add a new `standby` layout mode:

```tsx
layout?: 'split' | 'pip' | 'preview' | 'standby';

// standby mode:
// - Left: Local camera preview (70%)
// - Right: Opponent presence indicator (30%) OR opponent video if present
// - Ready status badges on both sides
```

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `src/hooks/useContenderReadiness.tsx` | Supabase Realtime Presence for barber readiness tracking |
| `src/hooks/useLocalCameraPreview.tsx` | Local camera preview without Twilio connection |
| `src/components/contender/ContenderPreviewOverlay.tsx` | Preview tips, ready status, and countdown UI |
| `src/components/contender/ReadinessBadge.tsx` | Visual indicator for ready/not-ready status |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/ContenderTheater.tsx` | Add 3-phase state machine (preview → standby → live), use new hooks |
| `src/components/contender/ContenderControlBar.tsx` | Add "I'M READY" button for preview phase |
| `src/components/streaming/BattleVideoContainer.tsx` | Add `standby` layout with presence indicators |
| `src/hooks/useBattleVideoRoom.tsx` | Accept existing stream from preview phase |

---

## Implementation Details

### Phase 1: Preview (useLocalCameraPreview)

```tsx
// On page load - immediately start camera preview
useEffect(() => {
  startPreview();
  return () => stopPreview();
}, []);

// Track own presence in battle room
useEffect(() => {
  if (previewStream) {
    trackPresence({ has_camera: true, is_ready: false });
  }
}, [previewStream]);
```

### Phase 2: Standby (useContenderReadiness)

```tsx
// When user clicks "I'M READY"
const handleReady = async () => {
  await setReady(true);
  // This updates presence to is_ready: true
};

// Watch for both ready
useEffect(() => {
  if (localReady && opponentReady) {
    startCountdown();
  }
}, [localReady, opponentReady]);
```

### Phase 3: Live (useBattleVideoRoom)

```tsx
// After countdown completes
const handleCountdownComplete = async () => {
  // Pass existing preview stream to Twilio connection
  await connect(previewStream);
  setPhase('live');
};
```

---

## Realtime Presence Schema

Channel: `battle-contenders-{battleId}`

Presence payload:
```json
{
  "barber_id": "uuid",
  "user_id": "uuid", 
  "display_name": "John Doe",
  "country_code": "US",
  "is_ready": false,
  "has_camera": true,
  "position": 1,
  "joined_at": "2026-02-04T10:00:00Z"
}
```

---

## User Experience Flow

1. **Barber enters ContenderTheater**
   - Camera permission requested immediately
   - Camera preview shows in 70/30 layout
   - "PREVIEW" badge visible
   - Right side shows "Waiting for opponent..."

2. **Barber adjusts camera/mic**
   - Toggle mic/video buttons work on local preview
   - Tips overlay: "Adjust your lighting for the best look"

3. **Barber clicks "I'M READY"**
   - Ready badge appears on their side
   - Status changes to "Ready - waiting for opponent"

4. **Opponent joins and also clicks ready**
   - Opponent's presence appears on right side
   - When both ready: "BOTH READY!" 
   - 5-second countdown begins

5. **Countdown completes**
   - Twilio room connection established
   - Phase transitions to `live`
   - 50/50 split view with full video streaming

---

## Visual Design

### Preview Phase Badges
```text
┌───────────────────────────┐
│ 👁 PREVIEW                │ ← Orange badge, top-left of local video
└───────────────────────────┘

┌───────────────────────────┐
│ ○ NOT READY              │ ← Gray badge on each side before ready
└───────────────────────────┘

┌───────────────────────────┐
│ ✓ READY                   │ ← Green badge after clicking ready
└───────────────────────────┘
```

### Countdown Animation
```text
       ╔═══════════════════════╗
       ║                       ║
       ║         🔥  3  🔥      ║  ← Large pulsing number
       ║                       ║
       ║   BATTLE STARTING...  ║
       ║                       ║
       ╚═══════════════════════╝
```

---

## Summary

This enhancement transforms the ContenderTheater into a proper pre-battle staging area:

1. **Immediate camera preview** - Barber sees themselves right away for adjustments
2. **Presence tracking** - Both barbers can see when the other has arrived
3. **Ready check system** - Explicit "I'M READY" action from both participants
4. **Countdown ceremony** - 5-second countdown builds anticipation
5. **Seamless transition** - Preview stream is reused for live connection

This creates a more professional, game-like experience where battles feel intentional rather than accidental.
