

## Scope (minimal)
Just `src/components/promotion-gate/FinalizeStep.tsx`. Don't touch claim logic — already correct (prize tied to email via `pending_spin_prize` + auto-claim in `Auth.tsx`/`Index.tsx`, only credits on signup completion).

## Changes

### 1. Make email editable
Replace read-only display (lines ~197-214) with a real `<input>` pre-filled from `prefilledEmail`. Add to zod schema: `email: z.string().trim().email()`. Pass `result.data.email` into `supabase.auth.signUp({ email, ... })`.

### 2. Add Back + Skip buttons (top)
Top bar above the form:
- **Back** (left): `<ArrowLeft>` ghost button → calls `onBack` prop (add to component props, wire up from `useGateState` parent to step back to RewardStep).
- **Skip** (right): ghost button → `markGateCompleted()` + `onSubmitted()`. No "(Dev)" label.

### 3. One-click social row (visual only)
Reuse the same 3 icons already on the landing page. Quick search confirms they live in the social login row component — read it, mirror the same Google/Apple/Instagram icon buttons (white circles with brand-colored icons). Place row directly under the "CLAIM {prize}" header, before email field. Buttons: `disabled` + `cursor-not-allowed` with tiny "Coming soon" tooltip — purely visual, no handler wiring.

Divider underneath: `── or continue with email ──`.

### 4. Brand polish
- Header: keep "CLAIM {prizeLabel}" but switch from cyan → gold→orange gradient (`from-amber-400 via-orange-500 to-orange-600 bg-clip-text`).
- Inputs (email + name + country): `rounded-[14px] border border-orange-500/40 bg-background/60 h-11 focus-visible:ring-orange-500 text-white placeholder:text-white/30`.
- Labels: `text-sm font-medium text-white` (drop cyan mono).
- CTA button: keep orange gradient, bump radius to 14px, label "⚡ CLAIM & CREATE ACCOUNT".
- Same 14px/orange treatment on the email-sent success screen.

## Files Touched
| File | Change |
|---|---|
| `src/components/promotion-gate/FinalizeStep.tsx` | Editable email + zod; Back & Skip buttons (top); visual-only social row using landing-page icons; rebrand to orange/14px |
| `src/components/promotion-gate/useGateState.ts` | If needed: expose `goBack` so FinalizeStep can return to RewardStep |

## Out of Scope
- Wiring social OAuth (visual only per request).
- Claim logic — already correct: prize stays in `localStorage` keyed to the session, only credits when `signUp` succeeds with that exact email; if user abandons, nothing is credited.

