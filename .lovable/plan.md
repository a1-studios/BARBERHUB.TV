

## Fix: ArenaGate Unmounts Mid-Flow When Account Is Created

### Root Cause
In `Index.tsx` line 113, the page conditionally renders `<LandingHero>` only when `user` is null. The `<ArenaGateModal>` lives inside `<LandingHero>`. When step 5 of the ArenaGate calls `supabase.auth.signUp` and succeeds, `onAuthStateChange` fires, `user` becomes non-null, `<LandingHero>` unmounts — taking the ArenaGateModal with it. The user gets dumped into the authenticated dashboard before finishing the onboarding steps (choose-tier, choose-categories).

### Fix

**`src/pages/Index.tsx`** — Lift ArenaGate state out of LandingHero

1. Add state for `showArenaGate` and `arenaGateComplete` at the `Index` level.
2. Pass a callback prop to `<LandingHero>` so when a barber clicks "Create Account", the Index-level `showArenaGate` is set to `true`.
3. Render `<ArenaGateModal>` at the **Index level**, outside the `user ? ... : ...` conditional, so it persists even after auth state changes.
4. After ArenaGateModal `onComplete` fires, navigate to `/profile`.

**`src/components/LandingHero.tsx`** — Remove internal ArenaGateModal

1. Remove the `<ArenaGateModal>` render from LandingHero.
2. Instead of setting local `showArenaGate` state, call the new `onOpenArenaGate` callback prop passed from Index.
3. Keep all other signup logic (fan flow) as-is.

### Files Changed
| File | Action |
|------|--------|
| `src/pages/Index.tsx` | Add ArenaGate state, render modal outside auth conditional |
| `src/components/LandingHero.tsx` | Remove ArenaGateModal, accept `onOpenArenaGate` prop |

