

## Fix Spin Wheel Award System + Display Prizes on Profile

### Problems Identified

1. **RLS blocks service-role inserts on `user_prizes`**: The migration created a policy `FOR ALL USING (false)` which blocks ALL operations including inserts from the service role client. The `spin-wheel` edge function uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS, so this should work — but if the service role client has `.auth.admin` mode off, inserts could fail silently. Need to verify and fix to use a permissive INSERT policy for service role.

2. **Authenticated users get awarded correctly** (BB via `spin-wheel` edge function), but there's **no success toast** confirming the award on the result screen for authenticated users — they just see "COLLECT & CLOSE" with no confirmation the backend succeeded.

3. **Guest flow works** (localStorage save + auto-claim on Index.tsx), but if the user navigates directly to `/auth` instead of going back to `/`, the auto-claim never fires because the claim logic only lives in `Index.tsx`.

4. **No prizes section on Profile page**: Users have no way to see their won prizes (free cuts, premium features, visibility boosts). The `user_prizes` table exists but nothing reads from it.

### Plan

#### 1. Fix RLS on `user_prizes` (migration)
- Drop the `FOR ALL USING (false)` policy (it's meant to block client-side writes but the service role bypasses RLS anyway)
- Add a proper INSERT policy: `FOR INSERT WITH CHECK (false)` to block client inserts while service role bypasses
- Keep the SELECT policy for users to read own prizes

#### 2. Add auto-claim to Auth page redirect
- In `Auth.tsx`, when user is authenticated and redirecting to `/`, the `Index.tsx` claim logic will handle it. But also add the claim logic to `Auth.tsx`'s redirect effect so it fires immediately after signup.

#### 3. Show success feedback in SpinWheelOverlay
- After the `spin-wheel` edge function succeeds for authenticated users, show a toast confirming the prize was credited.

#### 4. Create `MyPrizes` section on Profile page
- Add a collapsible "My Rewards" section in the Profile Tools area
- Query `user_prizes` for the current user, show active prizes with labels, type badges, and expiry dates
- Show a "No prizes yet" empty state

#### Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/new` | Fix `user_prizes` RLS — replace the `FOR ALL USING(false)` with proper INSERT/UPDATE blocking |
| `src/components/SpinWheelOverlay.tsx` | Add success toast after authenticated spin completes |
| `src/pages/Auth.tsx` | Add pending spin prize auto-claim on redirect |
| `src/components/profile/MyPrizesSection.tsx` | New component — queries and displays `user_prizes` |
| `src/pages/Profile.tsx` | Add MyPrizesSection collapsible in the Tools section |

