

## Camera Studio Upgrade & Challenge Integration Plan

### Current State
- `CameraStudio.tsx` exists with basic camera preview, device selectors, audio meter, and lighting indicator
- It uses a simple 2-column grid layout (video left, settings right) — NOT the 70/30 battle layout
- `BattleVideoContainer.tsx` already implements the 70/30 split with "YOUR SIDE" / "OPPONENT" panels and VS badge
- `ContenderTheater.tsx` uses `useBattleVideoRoom` hook for Twilio connections
- Challenge flow (`AcceptChallengeModal`) navigates to `/battles/:id` after acceptance — no camera check step

### Changes

**1. Rebuild `src/pages/CameraStudio.tsx`**
- Replace current grid layout with the 70/30 battle-style split view:
  - Left 70%: full local camera preview with "YOUR SIDE" label, rule-of-thirds overlay
  - Right 30%: opponent placeholder (showing "Test Opponent Area" with connection status)
- Add prominent camera/mic toggle buttons in a bottom control bar (matching ContenderControlBar style)
- Keep existing device selectors, audio meter, lighting indicator in a collapsible side panel or overlay drawer
- Add a "Test Twilio Connection" button that creates a test room via `generate-battle-token` edge function (using a special `test-studio` battle ID convention) and connects via `useBattleVideoRoom` — when connected, the opponent side shows the remote feed
- Add "Back to Portal" navigation

**2. Integrate into Challenge Section**
- Update `AcceptChallengeModal.tsx`: After successful acceptance, navigate to `/studio?battleId={battle_id}` instead of directly to `/battles/:id` — this gives barbers a camera check step before entering the contender theater
- Add a "Continue to Battle" button in CameraStudio that appears when a `battleId` query param is present, linking to `/battle/:id/contender`
- Update `OpenChallengeQueue.tsx`: Add a "📷 Check Your Gear" link button next to the "Issue Challenge" button that navigates to `/studio`

**3. Wire Twilio Room Connection in Studio**
- Accept optional `battleId` from URL query params in CameraStudio
- If `battleId` is present, use `useBattleVideoRoom({ battleId })` to enable the "Connect to Room" button
- When connected, show remote participant in the 30% opponent panel using `VideoAttach` from `BattleVideoContainer`
- If no `battleId`, the "Test Connection" button uses a local-only preview (no Twilio call)

**4. Update Quick Actions & Portal Links**
- `QuickActionsMenu.tsx` already has Camera Studio link (confirmed in codebase) — no change needed
- Add a "📷 Camera Studio" card in `Portal.tsx` below the barber stats section for quick access

### Files Modified
| File | Change |
|------|--------|
| `src/pages/CameraStudio.tsx` | Full rebuild with 70/30 layout, Twilio integration, toggle controls |
| `src/components/battles/AcceptChallengeModal.tsx` | Navigate to `/studio?battleId=X` after acceptance |
| `src/components/battles/OpenChallengeQueue.tsx` | Add "Check Your Gear" link to studio |
| `src/pages/Portal.tsx` | Add Camera Studio card in barber section |

No CSS, branding, or Tailwind config changes. Reuses existing `BattleVideoContainer` patterns and `useBattleVideoRoom` hook.

