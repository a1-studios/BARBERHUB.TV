# Camera Flip + Mirror Fix (Contender Theater)

## Problem
1. Local self-preview is rendered **un-mirrored** — front-camera footage looks "wrong" because users expect a mirror-like selfie view.
2. The **flip camera** button (`SwitchCamera`) already exists in `ContenderControlBar`, but it's gated to `isPreviewPhase` only and is not obvious. Barbers can't toggle between front (selfie) and back (environment) cameras during Standby.
3. Must not regress the working **Barber A → Barber B challenge/seating flow** (recent fix that resolves `barber_profiles.id` and seats `barber2_id` before marking the challenge completed, plus the realtime publication fix on `battles`).

## Changes

### 1. `src/hooks/useLocalCameraPreview.tsx`
- Already tracks `facingMode` ('user' | 'environment') and exposes `switchCamera`. No logic change needed — just confirm `facingMode` is exported (it is) so the UI can mirror conditionally.

### 2. `src/components/contender/ContenderVideoPreview.tsx`
- Accept a new optional prop `facingMode: 'user' | 'environment'` (default `'user'`).
- On the **local** `<video>` element only (the `isYourCamera` branch), apply `className` `scale-x-[-1]` when `facingMode === 'user'`, and remove it when `'environment'`. The opponent stream is never mirrored.
- This gives the natural "mirror" selfie experience and shows the back camera in its true orientation.

### 3. `src/components/contender/ContenderControlBar.tsx`
- Accept new prop `facingMode` (used for an aria-label/tooltip e.g. "Switch to back camera" / "Switch to front camera").
- Loosen the flip gate from `isPreviewPhase && onSwitchCamera` to **`(isPreviewPhase || isStandbyPhase) && onSwitchCamera`**. Flip remains disabled once the battle is `live` to avoid disturbing the LiveKit publication mid-fight.
- Keep the button styling consistent (white/20 ghost, w-12 h-12 mobile).

### 4. `src/pages/ContenderTheater.tsx`
- Pass `facingMode` from `useLocalCameraPreview` down into both `ContenderVideoPreview` (for mirror) and `ContenderControlBar` (for tooltip + correct gating).
- **No changes** to:
  - `barberPosition` resolution / acceptor fallback (`my-barber-profile` query)
  - Access Denied gate logic
  - `battle-contender` realtime subscription
  - `match-challenge-stake` edge function or any seating logic.

## Out of scope (do NOT touch)
- `supabase/functions/match-challenge-stake/index.ts`
- `supabase/functions/complete-open-challenge/index.ts`
- RLS policies / `battles` publication migration
- LiveKit token / publication wiring in `useBattleVideoRoom`

## Verification
1. Open `/battle/:id/contender` as Barber A → preview shows mirrored selfie (text on shirt reversed, but feels natural). Toggle flip → back camera shows un-mirrored real-world view.
2. Have Barber B accept the challenge → Barber A's screen seats B as opponent (existing fix unchanged), no "Access Denied".
3. Flip remains available in Standby; hidden/disabled in Live.
