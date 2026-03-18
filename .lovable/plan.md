

## Voice-First Booking Portal: Camera + Mic Capture Flow

### Concept
Transform the booking console into a portal-like experience. After the client takes a photo (camera button), a matching-size microphone button appears. The client speaks naturally — "I want a mid fade with a line-up, keep the top long" — and the voice transcript + photo are sent together to Gemini for a comprehensive style brief that auto-populates the appointment notes.

### What Exists
- `analyze-haircut` edge function already calls Gemini via `ai.gateway.lovable.dev` with image analysis
- `useCameraPermission` hook handles camera access + stream management
- `LOVABLE_API_KEY` secret is configured for the AI gateway
- No `StyleCaptureButton` component exists yet — the previous plan was approved but not implemented

### Changes

#### 1. Create `StyleCaptureButton.tsx` — Camera + Voice Capture Portal
A new component with two phases:

**Phase 1 — Camera**: Large circular camera button (64px, cyan accent). On tap, opens a fullscreen camera viewfinder overlay inside the dialog. Client taps a shutter button to capture. Photo is stored as base64 in state.

**Phase 2 — Microphone**: After photo capture, the camera button shrinks to show the captured thumbnail, and a matching-size mic button (64px, cyan) appears next to it with a pulsing animation. Client taps and holds (or taps to toggle) to record voice via `MediaRecorder` API. While recording, show a waveform-style pulse animation. On stop, the audio is transcribed by sending it to Gemini as a text prompt (we send the audio transcript request to the AI gateway).

**Transcription approach**: Use the Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) for real-time speech-to-text directly in the browser — no extra API calls needed. The transcript text is displayed below the buttons as editable text so the client can review/fix.

**Combined analysis**: Once both photo + transcript are captured, auto-call the `analyze-haircut` edge function with the image AND append the voice transcript to the preferences body. The edge function prompt will be updated to incorporate client-spoken preferences.

**Result display**: Show a compact summary pill: `"Mid fade · Line-up · Keep top long · Oval face · Wavy"` in cyan text.

#### 2. Update `analyze-haircut` edge function — Accept voice transcript
Add an optional `voice_transcript` field to the request body. When present, include it in the Gemini analysis prompt so the AI combines what it sees (photo) with what the client said (voice) into a unified style brief.

Updated prompt will say: *"The client described what they want: '{voice_transcript}'. Combine this with your visual analysis to produce a comprehensive style brief."*

Add a new field to the response: `client_brief` — a 1-2 sentence natural language summary combining visual analysis + spoken preferences.

#### 3. Update `BookingConsole.tsx` — Minimal Portal Layout
- Add `StyleCaptureButton` between the barber header and service selector
- When the AI analysis returns, auto-populate `notes` with the `client_brief`
- Replace the manual notes input with a compact "Edit notes" text link that expands only when tapped
- The camera+mic section is the visual hero of the booking dialog — large, centered, portal-like

#### 4. Simplify `BookingConsole.tsx` — Minimal Flow
- Hide SOS/House Call behind a small "More options" link at the bottom
- Default view: Camera/Mic portal → Service pills → 3 Quick Picks → Book button
- Remove wallet bar from default view (show only in escrow confirm)

### Files Changed

| File | Change |
|------|--------|
| `src/components/booking/StyleCaptureButton.tsx` | **New** — Camera capture + voice recording with Web Speech API transcription |
| `supabase/functions/analyze-haircut/index.ts` | Accept `voice_transcript`, combine with image analysis, return `client_brief` |
| `src/components/booking/BookingConsole.tsx` | Minimal portal layout, integrate StyleCaptureButton, auto-populate notes |

### Technical Notes
- Web Speech API (`SpeechRecognition`) works in Chrome, Edge, Safari — covers ~90% of mobile users. Falls back to a manual text input if unsupported.
- No additional secrets needed — uses existing `LOVABLE_API_KEY` for Gemini gateway.
- Camera uses `navigator.mediaDevices.getUserMedia` with `facingMode: 'environment'` (rear camera for selfie-style capture, switchable).

