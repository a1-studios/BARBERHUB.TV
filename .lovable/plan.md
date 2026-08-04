# Full Diagnostic: Structure, Operations & Logic

Everything below was verified against the live database, the edge-function source, and the frontend code in this turn. Findings are ordered by how much damage they can do.

## What I found

### 1. Money can be spent twice (critical)

Every place that changes a Barber Bucks balance reads the balance, then writes a new one, with nothing stopping two requests from interleaving. Two simultaneous requests can both read "100 BB" and both spend it.

Affected: `admin-award-barber-bucks`, `subscribe-with-bb`, `match-challenge-stake`, `purchase-barber-bucks`.

The correct pattern already exists in this project — `donate-to-battle` calls the `process_battle_donation` database function, and `spin-wheel` / `claim-bounty` use an optimistic balance check. It just wasn't applied everywhere.

Also: the Stripe purchase path credits BB with no duplicate-payment check. Stripe retries webhooks, so a retry credits the user twice.

### 2. A paywall is switched off in production code

`supabase/functions/match-challenge-stake/index.ts` line 5 has `DEV_BYPASS = true`, which skips the Silver+ subscription requirement on real staked challenges. Anyone can match paid stakes without a subscription.

### 3. 36 backend endpoints are open to the internet

36 functions are configured to skip token checks, and there is no shared secret anywhere in the project (confirmed: zero matches for a cron secret). That means anonymous callers can trigger battle-room closures, viewer-count writes, tournament matchmaking, payout release, push sends and strike enforcement.

### 4. Battles never finish

Live data: 53 battles — 32 stuck in `live`, 21 `upcoming` with no second barber, **zero votes cast, ever**, and no `ends_at` / `voting_ends_at` set on any of them.

Cause: the functions that close battles and voting (`auto-close-voting`, `close-voting`, `battle-reminders`, `subscription-expiry`, `release-pending-payouts`, `cleanup-community-notes`) exist but **have no scheduled job**. The database scheduler runs 15 jobs; none of them is a battle or voting closer.

So the lifecycle is: challenge → live → stays live forever. Voting, results, prize distribution and payouts are all downstream of a step that never runs.

### 5. Logged-in barbers and admins get kicked out on refresh

`BarberGuard` and `AdminGuard` only wait for the *role* to load, not for the *session* to load. On a page refresh the session is briefly empty, the role reads as "not a barber", and the guard redirects before auth finishes. `useSovereignRole` already handles this correctly — the two other guards don't.

Affected routes: `/portal`, `/creator-hub`, `/studio`, `/analytics`, `/admin/*`, contender theater.

### 6. Auth is handled in too many places at once

Three separate listeners react to the same sign-in event (`useAuth`, `ProfileCompletionGate`, `AuthCallback`), each firing its own database calls. The signup hash is read by three different components. `ProfileCompletionGate` opens itself on a 600ms timer that races its own data load, so the "+15 BB, complete your profile" prompt can silently not appear.

### 7. Structural duplication

- ~82 edge functions each copy-paste their own CORS block, auth extraction and error shape; error responses are inconsistent (400 vs 500 vs `200 {error}`), so the frontend can't branch on them reliably.
- Two full sign-in UIs coexist (`AuthDialog`, dead, still imported in `CreatorHub`; `AuthModalV2`, live). Two separate OTP implementations.
- Largest files are past maintainable size: `BarberPublicProfile` 1233 lines, `CameraStudio` 893, `WatchFeed` 806, `Profile` 721.

### 8. Clean bill of health

- RLS: every public table has policies except `phone_otp_codes`, which is intentionally locked to backend only. Correct.
- Only one always-true write policy (`seo_events` insert) — acceptable for an analytics sink.
- No orphaned barber profiles; country data is complete on barbers.
- MCP + OAuth are live and correctly configured.

---

## Proposed remediation, in order

**Phase 1 — Stop the bleeding (economy + access)**
1. Set `DEV_BYPASS = false` in `match-challenge-stake`.
2. Create one Postgres function per balance operation (`award_barber_bucks`, `spend_barber_bucks`) using `SELECT ... FOR UPDATE`, and switch all four functions above to call it. No more read-then-write.
3. Add a Stripe idempotency guard: record `payment_intent` and refuse to credit the same one twice.
4. Add a shared cron secret, require it in all 36 open functions, and store it as a project secret.

**Phase 2 — Make battles complete**
5. Register scheduled jobs for `auto-close-voting`, `close-voting`, `subscription-expiry`, `release-pending-payouts`, `battle-reminders`, `cleanup-community-notes`.
6. Set `ends_at` / `voting_ends_at` at battle creation so the closers have something to act on.
7. One-off cleanup of the 32 stuck live battles and 21 unseated upcoming battles.
8. Verify `close-voting` and `auto-close-voting` don't race each other; keep one, retire the other.

**Phase 3 — Auth correctness**
9. Add `authLoading` to `BarberGuard` and `AdminGuard` (copy the `useSovereignRole` pattern).
10. Collapse to a single auth listener in `useAuth`; have the gate and callback read from context instead of subscribing themselves.
11. Replace the 600ms timer in `ProfileCompletionGate` with state driven by the actual data load.
12. Make one component the single owner of the auth hash.

**Phase 4 — Structure**
13. Add `supabase/functions/_shared/` with `cors.ts`, `auth.ts`, `response.ts`; migrate functions to them and standardize error shape.
14. Delete `AuthDialog` and its dead import; share one OTP component.
15. Split the four oversized pages into presentational components + hooks.

## Technical notes

- Balance RPCs must be `SECURITY DEFINER` with `SET search_path = public`, and `EXECUTE` granted only to `service_role`.
- The cron secret should be verified before any other work in each function, returning 401 early.
- Scheduled jobs go in `cron.job` via a migration, calling the functions with the cron secret header.
- Guard fix is a one-line change in each of the two guard files; no logic redesign.
- Phases 1 and 2 are independent of 3 and 4 and can ship first.

## Scope check

This plan is large. If you'd rather not do all of it at once, Phase 1 + Phase 2 are the ones that affect real money and a broken core loop; Phases 3 and 4 are quality and maintenance.
