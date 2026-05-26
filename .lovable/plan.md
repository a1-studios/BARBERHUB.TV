## Problem

When a barber taps **Live Stream** in Camera Studio, the flow is:

1. `handleModeSelect('livestream')` → `await supabase.functions.invoke('generate-broadcast-token')` → `navigate('/broadcast/:id/studio')`
2. `BroadcastStudio` mounts `<LiveKitRoom video audio connect={true}>` inside a `useEffect`-driven render
3. LiveKit SDK then calls `getUserMedia` internally — but this happens **after** an `await` + route change, so it's no longer in a direct user-gesture context

On mobile browsers (the user is on a 390px viewport) this is exactly the case where `getUserMedia` is silently refused or never prompts. There are no edge-function logs because the failure is purely client-side, before LiveKit ever connects.

The companion symptom: `generate-broadcast-token` is also called a second time inside `BroadcastStudio` if state is missing, which can race with the first call.

## Fix

Acquire camera + mic permission **inside the user gesture** that starts the live-stream flow, then hand off to LiveKit.

### 1. `src/pages/CameraStudio.tsx` — `handleModeSelect('livestream')`

Before calling `generate-broadcast-token`, request the media stream from the click handler so the browser shows its prompt while still inside the gesture:

```text
- check canStream / streamPermLoading (unchanged)
- call navigator.mediaDevices.getUserMedia({ video:{facingMode:'user', width:1280, height:720}, audio:true })
- on NotAllowedError / NotFoundError / NotReadableError → toast a clear message and abort
- immediately stop those tracks (LiveKit will re-acquire) — the permission grant persists for the origin/session
- THEN call generate-broadcast-token and navigate
```

This means the OS permission dialog appears on the tap, and by the time LiveKit's SDK calls `getUserMedia`, the browser already has a granted permission and skips the prompt.

### 2. `src/pages/BroadcastStudio.tsx` — gate auto-connect behind a tap

Even with permission pre-granted, defer mounting `<LiveKitRoom connect={true} video audio>` until the user taps a **"Go Live"** button on this page. This guarantees the LiveKit publish step itself also runs inside a gesture, which fixes the remaining iOS Safari case where a route transition strips gesture context.

```text
- add state `const [started, setStarted] = useState(false)`
- while !started: render a centered "Tap to Go Live" button (and the existing "Connecting..." spinner only after tap)
- only when started && token && serverUrl: render <LiveKitRoom ...>
- on tap, setStarted(true)
```

### 3. Stop the duplicate token fetch

In `BroadcastStudio.tsx` the second `useEffect` re-fetches `generate-broadcast-token` if state is missing. Since Camera Studio now always passes the token via route state, keep the fallback but guard it with `started` so it never races with the initial call.

### 4. Add a clear error path

If permission is denied in step 1, show: *"Camera/microphone blocked. Enable them in your browser settings, then try again."* — and do **not** navigate to BroadcastStudio.

## Files

- `src/pages/CameraStudio.tsx` — modify `handleModeSelect`
- `src/pages/BroadcastStudio.tsx` — add tap-to-go-live gate, guard fallback token fetch

## Out of scope

- No changes to edge functions, LiveKit credentials, or DB schema.
- Contender Theater (PK battles) uses `useLiveKitStream` which already requests permission inside `startStream` from a click, so it's not affected.
