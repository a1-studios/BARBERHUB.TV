

## Fix Spin Wheel Prize Claiming + Navigation Routing

### Problem 1: Spin wheel prizes lost for new visitors
When an unauthenticated user spins and wins, `handleResult` skips the `spin-wheel` edge function call entirely. The prize is displayed but never persisted. There's also no mechanism to credit non-BB prizes (free cuts, premium unlocks) even for authenticated users — the `spin-wheel` edge function only handles BB values.

**Fix:** 
- Save the won prize to `localStorage` as `pending_spin_prize` when user is unauthenticated
- On `Index.tsx`, after user authenticates and profile loads, check for `pending_spin_prize` and call the `spin-wheel` edge function (with cost=0 for the free spin) to credit it
- Update the `spin-wheel` edge function to accept a `is_free_spin: true` flag that skips the 5 BB deduction (for first-time claims only)
- The edge function should also record non-BB prize types (free_cut, premium_unlock, etc.) into a new `user_prizes` table so they can be tracked and redeemed

**New table: `user_prizes`**
```sql
CREATE TABLE user_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prize_type text NOT NULL, -- 'bb', 'free_cut', 'premium_feature', etc.
  prize_label text NOT NULL,
  bb_value integer DEFAULT 0,
  duration_months numeric DEFAULT 0,
  status text DEFAULT 'active', -- 'active', 'redeemed', 'expired'
  claimed_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_prizes ENABLE ROW LEVEL SECURITY;
-- Users can view their own prizes
CREATE POLICY "Users can view own prizes" ON user_prizes FOR SELECT USING (auth.uid() = user_id);
-- System can insert/update
CREATE POLICY "System can manage prizes" ON user_prizes FOR ALL USING (false);
```

**Changes to `spin-wheel` edge function:**
- Accept optional `is_free_spin: boolean` — if true, skip the SPIN_COST deduction
- After crediting BB, also insert into `user_prizes` for non-BB prize types (free_cut, premium_unlock, visibility_boost)
- Prevent double-claiming free spins by checking if user already has a `spin_prize` transaction with `is_free_spin` source

**Changes to `SpinWheelOverlay.tsx`:**
- In `handleResult`, when `!isAuthenticated`, save `{ prize_id, prize_bb, prize_type, prize_label, role, duration_months }` to `localStorage` as `pending_spin_prize`
- Show the "CREATE ACCOUNT" CTA (already exists)

**Changes to `Index.tsx`:**
- Add a `useEffect` that checks for `pending_spin_prize` in localStorage when user becomes authenticated
- Calls `spin-wheel` with `is_free_spin: true` to credit the prize
- Clears localStorage after successful claim
- Shows a toast confirming the prize was credited

### Problem 2: "Watch Battles" and bottom nav route to Creator Hub
**Root cause:** `App.tsx` lines 64-66 redirect `/battles` → `/creator-hub`. The QuickActionsMenu "Watch Battles" points to `/battles`, so it lands on Creator Hub. The barber BottomNavBar "BATTLES" also points to `/creator-hub`.

**Fix:**
- **`App.tsx`**: Remove the `/battles` → `/creator-hub` redirect. Render `BattlesPage` at `/battles` (wrapped in AuthGuard)
- **`QuickActionsMenu.tsx`**: Change "Watch Battles" path from `/battles` to `/watch` for all users (consistent with fan nav)
- **`BottomNavBar.tsx`**: Change barber "BATTLES" path from `/creator-hub` to `/battles` so barbers can browse battles

### Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/new` | Create `user_prizes` table |
| `supabase/functions/spin-wheel/index.ts` | Add `is_free_spin` flag, insert into `user_prizes` for non-BB prizes |
| `src/components/SpinWheelOverlay.tsx` | Save pending prize to localStorage for unauthenticated users |
| `src/pages/Index.tsx` | Auto-claim pending spin prize after signup |
| `src/App.tsx` | Remove `/battles` → `/creator-hub` redirect, render BattlesPage |
| `src/components/QuickActionsMenu.tsx` | Change "Watch Battles" to `/watch` |
| `src/components/BottomNavBar.tsx` | Change barber "BATTLES" to `/battles` |

