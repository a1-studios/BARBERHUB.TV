

# Camera Studio: Full-Screen + Multi-Purpose Recording Hub

## What changes

The Camera Studio currently shows a permanent 70/30 split layout (your side / opponent placeholder) even when no challenge exists. This needs to become a **full-screen single-camera view** that only splits when an opponent actually connects. Additionally, the studio needs to serve as a **multi-purpose recording environment** — not just for battles, but for all content types barbers create on the platform.

---

## Part 1: Full-screen camera (remove permanent split)

**File: `src/pages/CameraStudio.tsx`**

Remove the `lg:w-[70%]` / `lg:w-[30%]` flex layout entirely. The camera preview fills 100% of the viewport — edge-to-edge like a native iOS camera.

- Delete the VS divider (lines 444-449)
- Delete the opponent panel (lines 451-487)
- Make the video element fill the entire viewport: `w-full h-full object-cover absolute inset-0`
- Only render the opponent panel + split layout **conditionally** — when `battleId` is present AND `battleRoom.hasOpponent === true`
- When opponent joins: transition to 70/30 split with animation

```text
DEFAULT STATE (no challenge):
┌─────────────────────────────┐
│                             │
│     Full-screen camera      │
│     (100% viewport)         │
│                             │
│  ┌───────────────────────┐  │
│  │ 🎥 🎤 🔄 ⏹ [MODE ▼] │  │  ← Bottom controls + mode picker
│  └───────────────────────┘  │
└─────────────────────────────┘

AFTER OPPONENT JOINS:
┌──────────────┬──────────┐
│  YOUR SIDE   │ VS │ OPP │
│    (70%)     │    │(30%)│
└──────────────┴──────────┘
```

## Part 2: Multi-purpose mode selector

Add a **mode picker** to the bottom control bar — a pill/drawer that lets barbers choose what they're recording:

| Mode | What it does |
|------|-------------|
| **Portfolio** | Records content for their barber profile portfolio |
| **Challenge** | Opens the barber search + challenge flow (existing `ChallengeModal`) |
| **Course** | Records an educational module/masterclass |
| **Tips** | Records a quick tip or technique video |

**Implementation:**
- Add a mode state: `useState<'idle' | 'portfolio' | 'challenge' | 'course' | 'tips'>('idle')`
- Render a mode picker drawer/sheet with 4 options (icon + label + description)
- When "Challenge" mode is selected, open the existing `ChallengeModal` component
- When Portfolio/Course/Tips is selected, show a recording indicator + REC button
- The mode selector button sits in the bottom control bar alongside video/audio/refresh controls

**File: `src/pages/CameraStudio.tsx`**
- Add mode state and mode picker UI
- Import `ChallengeModal` from existing component
- Add a red "REC" button that uses `MediaRecorder` API to capture the stream
- On stop recording: upload the recorded blob to R2 via presigned URL (existing `get-r2-presigned-url` edge function), tagged with the selected mode/folder

## Part 3: Recording capability

When barber taps REC in Portfolio/Course/Tips mode:
- Start `MediaRecorder` on the active stream
- Show recording timer + pulsing red dot
- On stop: collect chunks into a Blob, upload to R2 under the appropriate folder (`/portfolios/`, `/education/`, `/education/`)
- Use the existing presigned URL edge function for upload
- Show upload progress indicator

**New state/refs:**
- `isRecording`, `recordingMode`, `recordingDuration`
- `mediaRecorderRef`, `chunksRef`

## Files to modify

| File | Change |
|------|--------|
| `src/pages/CameraStudio.tsx` | Remove permanent split. Full-screen camera. Add mode picker + recording. Conditional split only when opponent connects. |

No new files needed — all changes are in CameraStudio.tsx, reusing existing components (`ChallengeModal`, presigned URL edge function).

