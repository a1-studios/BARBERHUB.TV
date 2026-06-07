## Goal
Fix the remaining case where a barber receives a challenge notification, taps Accept, and still lands on Access Denied in the contender room.

## What I found
- The app is currently using `match-challenge-stake`, not `complete-open-challenge`, for the accept action.
- Recent accepted challenge rows are being marked `completed`, but their linked `battles` rows are still left with `barber2_id = null` and `status = 'upcoming'`.
- In `match-challenge-stake`, the battle update result is not checked. If that write fails or no row is updated, the function still returns success and the UI navigates into the contender route.
- `ContenderTheater` renders Access Denied as soon as `barberPosition` is still null, without waiting for the participant profile lookup to fully settle, so the acceptor has no protection against timing/race issues.

## Plan
1. Harden the accept edge function
- Update `supabase/functions/match-challenge-stake/index.ts` so it treats the `battles.update(...)` as mandatory, not best-effort.
- Validate that the acceptor has a valid `barber_profiles.id` before updating the battle.
- Check the `battles` update response and fail the function if `barber2_id`, `status`, or the row update does not succeed.
- Return a clear error instead of navigating the barber into a broken battle.

2. Align access rules on accept
- Add the same barber-role enforcement to `match-challenge-stake` that already exists in `complete-open-challenge`.
- Prevent non-barber acceptors from entering a flow that cannot seat them into `battles.barber2_id` correctly.

3. Make the contender gate race-safe
- Update `src/pages/ContenderTheater.tsx` so it does not show Access Denied while the battle row and barber profile rows are still resolving.
- Add a proper loading/holding state for the acceptor path.
- Add a narrow acceptor fallback only after data has settled, so a valid participant is not denied because of query timing.

4. Verify the full flow
- Re-test the accept path from notification/takeover and modal accept into `/battle/:id/contender`.
- Confirm the battle row is updated with the acceptor’s `barber_profiles.id` and that the acceptor is recognized as `barber2`.
- Confirm the contender room no longer shows Access Denied for a valid acceptor.

## Technical details
- Files to update:
  - `supabase/functions/match-challenge-stake/index.ts`
  - `src/pages/ContenderTheater.tsx`
- Likely validation points after the fix:
  - `open_challenges.accepted_by_id` is set
  - `battles.barber2_id` matches the acceptor’s `barber_profiles.id`
  - `battles.status` is advanced as expected before navigation
- Note: I could not complete a live browser end-to-end click test from the preview because the preview session is currently logged out; once implemented, I’ll validate with the logged-in flow.