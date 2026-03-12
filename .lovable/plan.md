

## Fix: Skip Role Selection for Authenticated Users in Spin Wheel

### Problem
When an already signed-up user sees the spin wheel overlay, it still asks them to pick "Barber" or "Fan" — but the app already knows their role from `user_roles`. Authenticated users should skip the role-select step entirely and go straight to the BB cost confirmation screen.

### Changes

**`src/components/SpinWheelOverlay.tsx`**:

1. Import `useUserRole` hook to get the user's existing role
2. For authenticated users:
   - Auto-detect role from `useUserRole()` (`isBarber` → `'barber'`, else `'fan'`)
   - Set initial step to `'confirm-spin'` instead of `'role-select'` 
   - Pre-set `selectedRole` from their actual role on mount
   - Skip the "I am a..." role selection screen entirely
3. For unauthenticated users: keep the current flow (role-select → free spin → create account CTA)
4. Update `handleClose` reset logic to respect auth state (reset to `'confirm-spin'` for auth users, `'role-select'` for guests)

### Flow After Fix

| User State | Flow |
|-----------|------|
| **Not signed in** | Role select → Free spin → Win → "Create Account" CTA |
| **Signed in** | Confirm spin (shows 5 BB cost + balance) → Spin → Win → Collect |

### Files Changed

| File | Change |
|------|--------|
| `src/components/SpinWheelOverlay.tsx` | Import `useUserRole`, auto-detect role for auth users, skip to `confirm-spin` step, pre-set `selectedRole` |

