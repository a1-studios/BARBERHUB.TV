

## Remove All Tier Restrictions — Global Dev Mode Switch

### Problem
Tier/subscription gates exist in both frontend components and backend edge functions. The existing `DEV_MODE` flag in `useSubscriptionLimits` already bypasses frontend tier checks (returns `tierName: 'diamond'`), but the edge functions (`create-challenge-stake`, `match-challenge-stake`, `book-appointment`, `manage-appointment`) independently check the database for Silver+ subscriptions and will reject requests.

### Solution
Centralize everything around the existing `DEV_MODE` flag and bypass backend tier checks too.

### Changes

| File | Action |
|------|--------|
| `src/config/features.ts` | Add `DEV_MODE: true` here as the single source of truth |
| `src/hooks/useSubscriptionLimits.tsx` | Import `DEV_MODE` from features config instead of defining locally |
| `supabase/functions/create-challenge-stake/index.ts` | Wrap the Silver+ check in a `DEV_BYPASS` flag so it skips tier validation |
| `supabase/functions/match-challenge-stake/index.ts` | Same — wrap Silver+ check with bypass |
| `supabase/functions/book-appointment/index.ts` | Same — wrap tier check with bypass |
| `supabase/functions/manage-appointment/index.ts` | Same — wrap tier check with bypass |

### Frontend
Move `DEV_MODE` to `src/config/features.ts` so there's one visible on/off switch. `useSubscriptionLimits` already returns diamond-tier access when `DEV_MODE = true`, which makes all `isSilverPlus` checks in `ChallengeFeed`, `AcceptChallengeModal`, `BookingConsole`, etc. pass automatically.

### Backend (Edge Functions)
Add a `const DEV_BYPASS = true;` constant at the top of each gated edge function. When true, skip the subscription query and tier check entirely. Before deploy, flip to `false`.

### Single Switch
When ready to go live: set `DEV_MODE: false` in `features.ts` and `DEV_BYPASS = false` in each edge function. That's it.

