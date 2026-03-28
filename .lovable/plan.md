

# Fix Camera Studio: Flip Button, Record Button & Direct Challenge

## Three Issues

1. **Flip camera does nothing** — currently calls `stopPreview(); startPreview()` which re-opens the same default camera. There is no `facingMode` state, so it never switches between front and rear.
2. **No record button visible** — the REC button is gated behind `studioMode !== 'idle'`, but users land in `idle` mode. They must first open the mode drawer and pick Portfolio/Course/Tips before any record button appears.
3. **No barber search in Challenge modal** — the ChallengeModal only shows preset challenges and an open challenge feed. There is no way to search for a specific barber on the network and issue a direct challenge.

---

## Changes

### 1. Fix flip camera (src/pages/CameraStudio.tsx)

- Add `facingMode` state: `useState<'user' | 'environment'>('user')`
- In `startPreview`, use `facingMode` state instead of hardcoded `'user'` when no `selectedCamera` is set
- Replace the flip button's `onClick` to toggle `facingMode` and restart the stream:
  ```
  onClick={() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }}
  ```
- The existing `useEffect` on device changes (line 282) already calls `stopPreview(); startPreview()` — add `facingMode` to its dependency array so switching triggers a restart
- On mobile (iOS Safari), `facingMode` constraint is the only reliable way to switch cameras — `deviceId` enumeration is often restricted

### 2. Show record button by default (src/pages/CameraStudio.tsx)

- Remove the `studioMode !== 'idle'` guard from the REC/STOP button rendering (line 506)
- Always show the REC button when the camera is active — default recording mode is `portfolio`
- When user taps REC without selecting a mode, auto-set `studioMode` to `'portfolio'` so the upload path is defined
- Keep the mode badge: show "Portfolio" by default, update when user picks a different mode

### 3. Add barber search to ChallengeModal (src/components/battles/ChallengeModal.tsx)

- Add a "Direct Challenge" section above the existing ChallengeFeed
- Query `public_barber_profiles` view for barbers (same data source as BarberSearchAutocomplete)
- Show a search input + results list with avatar, name, and location
- When a barber is selected, show a stake slider (100-500 BB) and "Challenge [Name]" button
- On submit, call `create-challenge-stake` with the existing parameters + a new `target_barber_id` field

### 4. Update edge function (supabase/functions/create-challenge-stake/index.ts)

- Add optional `target_barber_id` to the `StakeRequest` interface
- When provided, set it on the `open_challenges` insert (the column may need to be added or use `bounty_description` to encode the target for now)
- This enables directed challenges that show up only for the targeted barber

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/CameraStudio.tsx` | Add `facingMode` state, fix flip button, show REC in idle mode |
| `src/components/battles/ChallengeModal.tsx` | Add barber search section with direct challenge UI |
| `supabase/functions/create-challenge-stake/index.ts` | Accept optional `target_barber_id` |

