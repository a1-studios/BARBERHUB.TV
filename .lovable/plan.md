# Fix Direct Challenge: Full-Screen Takeover + Send Error Audit

## Problem

1. **Receiver side**: When a barber is challenged, the alert only appears as a small sonner toast in the corner (via `useNotifications` `challenge_received` handler) and a bell-icon entry. There is no cinematic, screen-blocking Accept/Deny moment. The existing `ChallengerFoundOverlay` component was built for this but is **never mounted in the app** and listens for the wrong notification type (`battle_match` instead of `challenge_received`), with no Accept/Deny buttons.

2. **Sender side**: `create-challenge-stake` logs show successful 2xx responses (`stake=0` challenge created), yet the UI surfaces an error toast. Root cause: `ChallengeModal.issueDirectChallenge` calls `navigate('/battle/{id}/contender')` *inside* the `try` block — if the route's mount throws asynchronously, the catch is fine, but the bigger issue is that `supabase.functions.invoke` returns `{ data, error }` where `error` is set even on 200 if the response body has an `error` field is **not** the case here, but it's also set when the function returns non-2xx. We will harden the call to also check `data?.error` and only treat real failures as failures.

3. **Companion**: `match-challenge-stake` is logging `Unauthorized` (seen in logs) — that's from anonymous probes, not real users, but we'll keep it as-is. The accept flow itself is sound.

## Plan

### 1. New component: `IncomingChallengeTakeover`
Replace the unused `ChallengerFoundOverlay` with a real takeover that listens to `notifications` realtime for `type = 'challenge_received'`:

- Subscribe to INSERT on `notifications` filtered by current user.
- On insert, fetch the linked `open_challenges` row by `data.challenge_id` (need `title`, `challenger_username`, `stake_amount`, `pot_total`, `expires_at`, `status`).
- Render a fixed `inset-0 z-[200]` blurred backdrop with:
  - "INCOMING CHALLENGE" headline, animated `Swords` icon.
  - Challenger username, challenge title, stake/free badge, live countdown to `expires_at`.
  - Two large buttons: **Accept** (green gradient) and **Decline** (outline).
- **Accept** calls `supabase.functions.invoke('match-challenge-stake', { body: { challenge_id } })`; on success navigates to `/battle/{battle_id}/contender` and dismisses the notification (`dismissed_at = now`).
- **Decline** updates `open_challenges.status = 'declined'` and soft-dismisses the notification (same logic as `AcceptChallengeModal.handleDecline`).
- Auto-dismiss the overlay when `expires_at` passes (do NOT auto-accept).
- Queues multiple incoming challenges so a second arrival doesn't blow away the first.

### 2. Mount globally in `App.tsx`
Add `<IncomingChallengeTakeover />` once near the root inside the authenticated tree so it fires on any page (Watch Feed, Profile, Arena, etc.).

### 3. Suppress redundant toast for `challenge_received`
In `src/hooks/useNotifications.tsx`, when `newNotification.type === 'challenge_received'`, **skip the sonner `toast(...)` call** (the takeover handles it). Keep the bell-list update intact so it persists in the dropdown if they dismiss the overlay.

### 4. Delete the dead `ChallengerFoundOverlay.tsx`
Unused, listens for the wrong type, no replacements reference it.

### 5. Harden sender error handling in `ChallengeModal.issueDirectChallenge`
- Check `data?.error` after `invoke` and throw with that message.
- Move `navigate(...)` **after** `setIsIssuing(false)` and outside the try, so a routing hiccup never trips the "Failed to issue challenge" toast.
- Show success toast only when `data?.success === true`.

### 6. No DB schema changes required
`open_challenges.target_barber_id` already exists. `notifications` table already supports `dismissed_at`. The `create-challenge-stake` function already inserts the `challenge_received` row when `target_barber_id` is present — that's the realtime trigger the new takeover listens to.

## Files touched
- **New**: `src/components/battles/IncomingChallengeTakeover.tsx`
- **Edit**: `src/App.tsx` (mount overlay)
- **Edit**: `src/hooks/useNotifications.tsx` (suppress duplicate toast for `challenge_received`)
- **Edit**: `src/components/battles/ChallengeModal.tsx` (harden error handling, move navigate)
- **Delete**: `src/components/battles/ChallengerFoundOverlay.tsx`

## Verification
- Send a challenge from Barber A → Barber B's screen blacks out within 1s with name, title, countdown, Accept/Decline.
- Accept routes both barbers into `/battle/{id}/contender`.
- Decline closes overlay and marks challenge `declined`.
- Sender no longer sees a false error toast on successful 2xx.
- No bell-corner toast duplicates the takeover.
