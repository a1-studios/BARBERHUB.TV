

## Goal
Transform the **Sign Up tab inside `AuthDialog`** from a generic form into a high-conversion, offer-driven claim screen that surfaces the pending spin-wheel prize, leads with one-click social auth, and uses brand-consistent rounded geometry with orange accents.

## Current State
`src/components/auth/AuthDialog.tsx` shows a plain "Join Barber Hub" header, role buttons, name/country/email/password inputs, and a flat "Create Account" button. No social auth at the top. No mention of the prize the user just won. Square-ish inputs (default `rounded-md`), no orange accents.

The pending prize is already stored in `localStorage.pending_spin_prize` (set in `FinalizeStep.tsx`), with a `prize_label` field like "1 MONTH FREE CUT". After signup, `Index.tsx` / `Auth.tsx` already auto-claim it — that logic stays untouched.

## Approach

### 1. Pending-prize hook (new helper inline in AuthDialog)
On mount, read `localStorage.pending_spin_prize`. If present and < 24h old, expose `prizeLabel` (e.g. "1 MONTH FREE CUT"). Drives the dynamic header.

### 2. Redesign the signup tab in `src/components/auth/AuthDialog.tsx`

**Dynamic Offer Header** (replaces `<DialogTitle>"Join Barber Hub"` for the signup tab):
- If `prizeLabel` exists: show in extra-bold uppercase, gold-to-orange gradient text:  
  `"CLAIM "` + `<prizeLabel>` (e.g. "CLAIM 1 MONTH FREE CUT")  
  with subtitle "Create your account to lock it in."
- Else (no pending prize): show "JOIN THE ARENA" in the same bold orange treatment.
- Class: `text-2xl md:text-3xl font-black uppercase tracking-tight` with `bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent`.

**Social Auth at Top (one-click intake)**
- Add a 3-button row directly under the offer header **before** the role selector: Google, Apple, Instagram.
- Use existing `signInWithOAuth` for Google (Apple/Instagram open a "Coming soon" toast for now since Supabase project doesn't have them enabled — keeps UI promise without breaking).
- Style: `h-11 rounded-[14px]` icon-only circular-ish square buttons with white bg + brand colored icon, hover ring orange.
- Below the row: small divider "or sign up with email".
- Behavior: if OAuth completes, auth state listener already fires and `Auth.tsx` / `Index.tsx` already auto-claims the pending prize → success state is automatic. Document this in a small comment.

**Geometry refinement (14px rounding, orange accents)**
- All `<Input>` get `className="rounded-[14px] border-orange-500/40 focus-visible:ring-orange-500 focus-visible:border-orange-500 bg-background/60"`.
- Role buttons: bump from `rounded-lg` → `rounded-[14px]`.
- Country selector trigger: same 14px + orange border (passed via wrapper class).
- Dialog content: add `rounded-[14px]` (overrides default `sm:rounded-lg`).
- Labels stay clean white: add `className="text-white"` to all `<Label>`.

**Vibrant CTA**
- Submit button rebuilt: `h-12 rounded-[14px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider text-base shadow-lg shadow-orange-500/30`.
- Label changes dynamically:
  - With prize: `"⚡ CLAIM & CREATE ACCOUNT"`
  - Without: `"⚡ CREATE ACCOUNT"`

**Functional polish (preserved as-is)**
- Country mandatory check, password length, role selection, Arena Gate for barbers — all unchanged.
- For users who arrive already authenticated through social OAuth, `AuthDialog` simply closes (existing useAuth listener handles redirect + prize claim via `Index.tsx`/`Auth.tsx` flows).

### 3. Sign-in tab — light touch
Apply the same input rounding (14px) + orange accent border + white labels, and rounded primary button, so the dialog feels cohesive across both tabs. Keep "Sign In" header text but make it match the bold uppercase treatment in white (no offer styling on signin).

## Files Touched
| File | Change |
|---|---|
| `src/components/auth/AuthDialog.tsx` | Dynamic prize header, top social-auth row (Google/Apple/Instagram), 14px-rounded orange-accented inputs/buttons, vibrant claim CTA, white labels, sign-in tab style polish |

## Out of Scope
- `SignUpForm.tsx` (legacy, not the active path) — leave untouched.
- Auto-claim flow (already correct in `Auth.tsx` + `Index.tsx`) — leave untouched.
- Adding real Apple/Instagram OAuth providers — surfaces in UI but shows a "coming soon" toast on click; can be wired later when Supabase providers are configured.

## Result
- Mobile-first claim screen that feels like a one-tap reward unlock, not a form.
- Prize text headlines the dialog in gold→orange gradient — instant value clarity.
- Social buttons up top dramatically reduce friction for users with Google.
- Every surface uses 14px rounding and orange accents — consistent with brand.
- The big orange CTA at the bottom is unmistakably the next action.

