## Plan

1. Stop the gate from rendering for authenticated users
- Update the home page gate logic in `src/pages/Index.tsx` so the Launch Wizard only mounts for guests.
- Make the initial `showSpinWheel` state and render conditions depend on auth state, not just `localStorage`/`sessionStorage`.
- Preserve the current OAuth resume flow, but only for genuine sign-up roundtrips.

2. Replace the current browser-only "seen" check with a first-visitor eligibility check
- Add a small backend-backed eligibility check so the gate is shown only to a first-time guest visitor instead of every browser that lacks `gate_completed`.
- Use the existing visitor fingerprint pattern (`getDeviceFingerprint`) and add an IP-aware first-seen record so the app can suppress the gate for returning visitors from the same IP/network.
- Keep local/session storage as a fast client cache, but make the server-side first-visit decision the source of truth.

3. Add a lightweight visitor tracking table or RPC in Supabase
- Create a migration for a dedicated public table such as `promotion_gate_visitors` (or equivalent) with fields like fingerprint, first_seen_ip_hash / ip marker, first_seen_at, last_seen_at, and `gate_completed`.
- Add RLS or a `SECURITY DEFINER` RPC so the client can:
  - check whether the current visitor is new
  - mark the visitor as seen when the gate is shown/skipped/completed
- Keep role data separate from profiles/users and avoid storing secrets client-side.

4. Add an Edge Function or RPC for IP-aware eligibility
- Implement a minimal server-side endpoint that reads the request IP from headers, hashes or normalizes it safely, and decides whether this is a new visitor.
- Return a simple shape such as:
```text
{ shouldShowGate: boolean, reason: 'new_visitor' | 'seen_before' | 'signed_in_user' }
```
- Use this from `Index.tsx` before opening the Launch Wizard.

5. Wire completion and skip paths into the new eligibility system
- Update `markGateCompleted()` / gate-close handling so completion is stored both locally and server-side.
- Ensure Skip also records the visitor as already prompted, so the gate does not reappear for the same IP/fingerprint on refresh.
- Keep existing prize-claim and OAuth resume behavior intact.

6. Validate the full flow
- Test these cases:
  - signed-in existing user: gate never appears
  - brand-new guest visitor: gate appears once
  - same guest after refresh: gate does not reappear
  - guest who signs up through the wizard: no repeat gate after auth
  - OAuth resume: wizard resumes correctly only during that flow

## Technical details
- Root cause in the current code: `src/pages/Index.tsx` initializes and renders `showSpinWheel` without checking `user`, so authenticated users can still get the overlay if local flags are absent.
- Current persistence is browser-only (`gate_completed`, `spin_wheel_shown`), which cannot satisfy a true "new user IP only" rule.
- The clean fix is:
```text
guest auth check
  -> server eligibility check (fingerprint + IP-aware first seen)
    -> show gate once
    -> persist seen/completed state server-side + local cache
```
- I will reuse existing patterns already in the project:
  - `getDeviceFingerprint()` from `src/utils/deviceFingerprint.ts`
  - gate completion helpers in `src/components/promotion-gate/useGateState.ts`
  - Supabase-backed marketing/visitor tracking patterns already present in the codebase

## Files likely involved
- `src/pages/Index.tsx`
- `src/components/promotion-gate/useGateState.ts`
- `src/utils/deviceFingerprint.ts`
- new Supabase migration in `supabase/migrations/`
- new or updated Supabase function/RPC for gate eligibility

If you approve this plan, I’ll implement it.