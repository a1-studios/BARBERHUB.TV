## What I’ll fix

1. **Repair the binary role flow** so a user cannot end up half-barber / half-fan.
2. **Stop the profile page from re-asking for setup** after the barber already completed the first step.
3. **Restore the spin-wheel claim path** so new barber and fan signups can actually receive their prize.

## Why this is happening

I found a live mismatch in the current data:
- A recent user has `profiles.user_type = barber`
- The same user still has a **fan/client profile**
- The same user has **both `barber` and `fan` roles**
- That user has **no `barber_profiles` row**

So the app is currently treating “profile complete” in **two different ways**:
- `ProfileCompletionGate` only checks the basic `profiles` row (`user_type` + `country_code`)
- `Profile` page also checks whether the specialized row exists (`barber_profiles` or `client_profiles`)

That means the first step succeeds, but the second system still thinks the account is incomplete.

I also found the spin recovery path is fragile:
- it decides the user role before role/profile data is fully hydrated
- it can discard a pending prize if the role looks mismatched during that window
- it relies on a very tight “new account” timing check on the edge function

## Implementation plan

### 1) Enforce the binary system on the backend
Create a database-side repair/sync path so barber vs fan stays consistent.

This will:
- backfill any broken recent accounts
- ensure only **one primary role** exists between `barber` and `fan`
- keep admin/sovereign roles intact
- create the matching specialized profile row when missing
  - `barber_profiles` for barbers
  - `client_profiles` for fans
- remove the opposite specialized row when the account was incorrectly registered on the wrong side

### 2) Update the OAuth/profile-finalization flow
Refactor `finalize-oauth-claim` so it does not only write `profiles.user_type` and add a role.

Instead it will:
- call the backend sync logic
- guarantee the correct specialized profile exists immediately
- guarantee the wrong side is cleaned up
- keep the BB prize credit linked to the correct account

### 3) Fix the profile page gating logic
Unify the frontend checks so the app does not treat the same user as complete in one place and incomplete in another.

This will include:
- using a single source of truth for “what is still missing?”
- distinguishing between:
  - **basic account completion**
  - **barber/fan specialized profile completion**
- showing the right CTA for barbers who still need to finish their barber profile instead of bouncing them through the wrong prompt state

### 4) Fix spin-wheel prize recovery after signup
Adjust the homepage recovery flow so it waits for the actual resolved role/profile state before claiming or rejecting the prize.

This will include:
- waiting for role hydration before comparing the pending prize role
- using the resolved primary role from the account, not a fallback assumption
- preventing false role-mismatch deletes
- making the new-user prize claim path work reliably for both barber and fan signups

### 5) Validate with live-data scenarios
After the fix, I’ll verify these cases:
- new barber signup → completes claim → no repeat “complete profile” loop
- new fan signup → claim succeeds
- barber prize is not rejected as fan prize, and vice versa
- existing broken account is repaired into the correct side of the binary system

## Technical details

### Files likely to change
- `supabase/functions/finalize-oauth-claim/index.ts`
- `src/pages/Profile.tsx`
- `src/hooks/useProfileSetup.tsx`
- `src/hooks/useProfileIncomplete.tsx`
- `src/pages/Index.tsx`

### Database work likely needed
A migration will likely add secure server-side role/profile synchronization and backfill broken users already created with mixed state.

### Key rule preserved
- Users remain permanently either **Barber** or **Fan** in the binary ecosystem
- Admin/Sovereign access can still coexist without turning a user into both Barber and Fan