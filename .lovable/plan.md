## Remaining security findings to fix

After reviewing the current state, two findings are still open:

### 1. Security Definer View — `public.tournament_finalists`
The other two public views (`public_barber_profiles`, `public_user_profiles`) already have `security_invoker=on` set. Only `tournament_finalists` is still running with the creator's privileges (default Postgres behavior, which Supabase's linter flags as `SECURITY DEFINER`).

**Fix:** Recreate the view with `WITH (security_invoker = on)` so it enforces the querying user's RLS on `tournament_standings` and `barber_profiles`.

### 2. Realtime channel authorization — `realtime.messages`
Any authenticated user can currently subscribe to any Realtime topic (battle coordination, other users' notifications, admin channels). We need RLS policies on `realtime.messages` to scope subscriptions by topic.

**Fix:** Enable RLS and add policies that match topic patterns used in the app:

- `battle-presence-{battleId}`, `battle-chat-{battleId}` — allow any authenticated user (these are public live battle rooms).
- `match-notifications` filtered by `user_id=eq.{auth.uid()}` — restrict to the owning user. Since Realtime topics for postgres_changes use the channel name, we'll allow `match-notifications` only when the user is authenticated AND restrict notification table broadcasts via the existing notifications RLS (postgres_changes already respects table RLS, so subscribing to the channel alone doesn't leak data — but we still gate the channel name).
- Sovereign/admin channels — restrict to users with the `sovereign` role via `has_role()`.
- Default deny for everything else.

Concretely, add policy on `realtime.messages` for SELECT (read = subscribe) and INSERT (write = broadcast/presence) using `realtime.topic()` LIKE patterns + `auth.uid()` checks.

### Out of scope (require dashboard action by you)
- Postgres version upgrade, leaked-password protection, OTP expiry — Supabase dashboard settings.

If this looks right, approve and I'll ship the migration.
