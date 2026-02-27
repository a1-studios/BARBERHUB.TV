

## Pause All Subscription Tier Gates for Dev Testing

Add a single `DEV_MODE` flag to `useSubscriptionLimits` that makes every user appear as a `diamond` tier subscriber with unlimited access. This bypasses all tier checks across the entire app (challenges, battles, booking, etc.) without touching individual components.

### `src/hooks/useSubscriptionLimits.tsx`

- Add a constant `const DEV_MODE = true;` at the top of the file
- When `DEV_MODE` is `true`, override all return values:
  - `tierName` → `'diamond'`
  - `monthlyLimit` → `9999`
  - `canCreateBattle` → `true`
  - `isUnlimited` → `true`
  - `hasActiveSubscription` → `true`
  - `checkLimit` → always returns `true`
- Keep the real subscription queries intact (just skip them with `enabled: false` when DEV_MODE is on) so flipping the flag back restores production behavior
- Add a comment: `// TODO: Set to false before going live`

This single change unlocks all Silver+/Gold gates across: `IssueChallenge`, `ChallengeFeed`, `AcceptChallengeModal`, `OpenChallengeQueue`, `CreateBattle`, `BarberAppointmentManager`, and edge functions (frontend gates only — edge function tier checks remain as backend safety but won't block since the UI won't prevent actions).

