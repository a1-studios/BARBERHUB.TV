

## Fix Welcome-Back Name Display + Spin Wheel Auth Logic

### Problem 1: Welcome-back toast shows no name
The toast reads from `user.user_metadata?.display_name` which is often empty. The actual name lives in the `profiles` table (or `barber_profiles`). Also needs cyan neon styling for the name and a brief highlight effect.

### Problem 2: Spin wheel prompts role selection for signed-in users
`SpinWheelOverlay` initializes `step` via `useState(isAuthenticated ? 'confirm-spin' : 'role-select')`. Since `user` is often `null` during the first render (auth is loading), the step locks to `'role-select'` and never updates — so authenticated users see the "I am a..." role picker.

### Changes

**1. `src/pages/Index.tsx`** — Fix welcome-back toast with profile name
- Import `useUserProfile` hook
- Replace `user.user_metadata?.display_name` lookup with `profile?.display_name` from the profiles table
- Use `toast()` with a custom JSX message: render the name in cyan neon (`text-cyan-400 font-bold`) with a brief glow effect
- Add `profile` to the useEffect dependency so it fires once the profile loads
- After toast, prompt spin by not auto-dismissing the spin wheel (already shows once per session — just ensure it appears after the toast)

**2. `src/components/SpinWheelOverlay.tsx`** — Fix auth-aware step logic
- Add a `useEffect` that watches `user` and `isBarber`: when user becomes authenticated, auto-set `selectedRole` to the detected role and set `step` to `'confirm-spin'`, skipping the role picker entirely
- Remove the role-select initialization from `useState` — always start at `'role-select'`, let the effect correct it
- This ensures that even if auth loads after mount, authenticated users never see the role picker

### Files Changed
| File | Action |
|------|--------|
| `src/pages/Index.tsx` | Use profile name in styled welcome toast |
| `src/components/SpinWheelOverlay.tsx` | Add useEffect to skip role-select for authenticated users |

