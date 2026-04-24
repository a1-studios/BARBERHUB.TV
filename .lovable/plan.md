# Fix: Challenge notification flow is silently broken

## Root cause (verified against the live DB)

I traced a fresh challenge (`2c210e4b…`) created at 18:52:45. The system **does** create the row in `open_challenges` AND the `challenge_received` notification for the target barber `09acf09b…`. The bell row exists, but the full-screen `IncomingChallengeOverlay` never appears, and any attempted Decline throws.

Three concrete bugs in `src/hooks/useIncomingChallengeOverlay.tsx` and `src/components/battles/IncomingChallengeOverlay.tsx`:

1. **Wrong status filter (silent reject).** Hydration rejects unless status is `'pending' | 'open' | 'active'`. The actual DB constraint only allows `'waiting_for_opponent' | 'completed' | 'expired'`. So every brand-new challenge is filtered out → overlay never opens → "barber isn't getting it."
2. **Selecting columns that don't exist.** The query reads `challenger_avatar` and `challenger_country` from `open_challenges`, but those columns live on `profiles`. Even if the status check passed, hydration would crash or silently drop those fields.
3. **Decline writes an illegal status.** The Decline button sets `status: 'declined'`, which violates the check constraint `status IN ('waiting_for_opponent','completed','expired')` → toast error pops on every decline.

There is also a smaller polish issue: when the overlay is closed via the X, the bell still routes the user to the **viewer** battle page on click, not the lobby. The accepted-by-target should land in the contender lobby.

## What I will change

### 1. `src/hooks/useIncomingChallengeOverlay.tsx`
- Rewrite `hydrateFromNotification` to:
  - Select the correct columns from `open_challenges` (`id, challenger_id, challenger_username, title, stake_amount, pot_total, expires_at, status, target_barber_id`).
  - Accept only the real "still open" status: `status === 'waiting_for_opponent'`.
  - Drop rows whose `target_barber_id` doesn't match the current user (defensive — keeps stale broadcasts out).
  - Fetch `avatar_url, country_code` separately from `profiles` for the challenger so the overlay can show flag + avatar.
- Keep the realtime + polling logic untouched.

### 2. `src/components/battles/IncomingChallengeOverlay.tsx`
- Decline path: set `status: 'expired'` and `expires_at: now()` (legal under the check constraint) instead of `'declined'`. Also dismiss the notification so the bell clears for both users.
- After Accept, navigate to `/battle/{battleId}/lobby?source=challenge` (already correct) — keep as-is, but make sure we always have `battle_id` (fall back to a re-fetch from `open_challenges` if the function response omits it).
- Show a small "from {challenger_username}" line even when avatar/country are absent (so the overlay still renders gracefully when the profile lookup fails).

### 3. `src/hooks/useNotifications.tsx` — bell click for `challenge_received`
- When the user opens the bell and clicks an unread `challenge_received`, re-open the overlay instead of routing them anywhere. We do this by exposing a tiny `window.dispatchEvent(new CustomEvent('reopen-incoming-challenge', { detail: { notification_id }}))` and having `useIncomingChallengeOverlay` listen for it and re-hydrate that specific notification. (No DB changes — purely client wiring.)

### 4. Sanity check on `match-challenge-stake`
- The function already correctly flips `battles.status='live'`, sets `barber2_id`, and emits `challenge_accepted`. No changes needed.
- The recent edge logs show `Unauthorized` errors — those are the **expected** preflight calls from the lobby polling before the user is authed; they are not user-facing failures. No change required.

## Out of scope (intentionally)
- 3D lobby visuals, controls, or environment — last round's plan covered that and the user's complaint this turn is purely about the notification + accept flow.
- Donations / pot splits — already wired and untouched.

## Verification steps after implementation
1. Barber A challenges Barber B → on Barber B's screen the full-screen orange "Incoming Challenge" overlay appears within ~2s (realtime), shows challenger avatar + country flag if set, stake, and a live countdown.
2. Tap **Accept Challenge** → both users land in `/battle/:id/lobby?source=challenge`, then into the contender theater when both lock in.
3. Tap **Decline** → no error toast; the row in `open_challenges` becomes `expired`, the bell clears for both users, and the overlay closes.
4. Tap the **X** → overlay closes but the bell still shows the unread notification; clicking it from the bell re-opens the overlay (not the viewer feed).
5. Existing feed bubbles, voting, and donation buttons are unaffected (no files in those paths are touched).
