

## Fix: Spin Wheel Giving Prizes to Already Signed-In Users + Wrong Prize Attribution

### Problems

1. **Spin wheel auto-shows for signed-in users every session** and lets them spin. The overlay shows role-select buttons (Barber/Fan) even for authenticated users on first render (before the `useEffect` fires to skip to `confirm-spin`). So a signed-in barber can pick "Fan", spin the wheel, and get a fan prize (like "3 Month Free Cuts") attributed to their barber account.

2. **Guest prize auto-claim doesn't check role match**. A guest picks "Fan", wins a prize, it goes to `localStorage`. They then sign in to an existing barber account, and `Index.tsx` auto-claims the fan prize onto the barber account — wrong role, wrong user.

3. **Authenticated users get the spin for free** if they pick a role before the `useEffect` skips them to `confirm-spin`. The `handleRoleSelect` function sends guests directly to `spinning` step, but an authenticated user who clicks the role button fast enough also goes to `spinning` — bypassing the BB cost confirmation.

### Root Causes
- Race condition: `useEffect` to skip role-select runs after first render, so the role buttons are briefly clickable
- `localStorage` auto-claim in `Index.tsx` doesn't validate that the signed-in user's role matches the prize role
- No server-side check that authenticated users must pay (the `is_free_spin` flag is client-controlled)

### Fix

#### 1. `SpinWheelOverlay.tsx` — Block role-select for authenticated users
- Initialize `step` based on auth state: if `user` exists at mount time, start at `confirm-spin` with `detectedRole` already set. Never show role-select to authenticated users.
- Remove the ability for authenticated users to reach `spinning` step without going through `confirm-spin` (BB payment confirmation).

#### 2. `Index.tsx` — Validate role match before auto-claiming guest prize
- Before calling `spin-wheel` with the pending prize, check that `pending.role` matches the user's actual role (from `useUserRole`). If mismatch, discard the prize silently.
- Also clear `pending_spin_prize` from localStorage immediately when an authenticated user logs in (regardless of claim success) to prevent repeated attempts.

#### 3. `Auth.tsx` — Same role validation on auto-claim
- Apply the same role-match check before claiming the pending spin prize after signup/login.

#### 4. `spin-wheel` edge function — Server-side role validation
- When `is_free_spin` is false (paid spin), verify the user actually has enough BB and deduct it (already done).
- When `is_free_spin` is true, also check that the user was recently created (within 1 hour) to prevent existing accounts from exploiting the free spin flag.

### Files Changed

| File | Change |
|------|--------|
| `src/components/SpinWheelOverlay.tsx` | Initialize step to `confirm-spin` for authenticated users at mount time; never show role-select to logged-in users |
| `src/pages/Index.tsx` | Validate user role matches prize role before auto-claiming; clear localStorage on mismatch |
| `src/pages/Auth.tsx` | Same role validation on auto-claim after signup |
| `supabase/functions/spin-wheel/index.ts` | Add server-side check: free spins only allowed for accounts created within 1 hour |

