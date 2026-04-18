

# Cyber-Industrial Promotion Gate — Multi-Step State Machine

## Goal

Re-engineer `SpinWheelOverlay` into a 5-state mandatory promotion gate `INITIAL → IDENTIFY → ENGAGE → REWARD → FINALIZE`) with cyber-industrial aesthetic, incremental lead capture, localStorage state persistence, and auto-login on completion.

## Current State Audit

- Existing `SpinWheelOverlay.tsx` has 4 steps for guests `role-select → spinning → result`) + a "Skip for now" / "Maybe later" exit.

- Lead capture only writes to `localStorage.pending_spin_prize`; no `marketing_leads` upsert during the flow.

- Persistence via `sessionStorage('spin_wheel_shown')` — resets every refresh, no mid-flow recovery.

- Final CTA navigates to `/auth?tab=signup` — requires user to re-enter everything.

## Architecture

### State Machine

```

INITIAL  → email input only, autoFocus, real-time Zod validation, disposable-domain denylist

   ↓ (email valid + Continue)

IDENTIFY → sliding-door animation reveals Barber | Fan tiles

   ↓ (role selected → upsert marketing_leads {email, role, fingerprint})

ENGAGE   → vault-door wheel + draggable lever (Framer Motion drag) to trigger spin

   ↓ (spin completes → update lead {prize_id, prize_label})

REWARD   → neon-orange holographic prize reveal

   ↓ (auto-advance after 2s OR "Claim" button)

FINALIZE → Full Name, Username, Country, Phone form

   ↓ (submit → signUp + auto-login + redirect /profile)

DONE     → localStorage.gate_completed = '1'

```

### Persistence Layer

Single key `gate_state` in localStorage:

```ts

{ step, email, role, prizeId, prizeLabel, prizeBb, fingerprint, ts }

```

- Saved on every state transition.

- On mount: hydrate state if `gate_state` exists and `gate_completed !== '1'`.

- Cleared on FINALIZE success.

### Incremental Lead Capture `handleLeadUpdate`)

New helper writes to `marketing_leads` via existing anon-INSERT policy + `update_marketing_lead_by_fingerprint` RPC:

- **After INITIAL**: insert `{ email, device_fingerprint }`

- **After IDENTIFY**: update `{ role }`

- **After ENGAGE**: update `{ prize_id, prize_label, spins_used: 1 }`

- **After FINALIZE**: update `{ converted: true, full_name, username, country, phone }`

### Auto-Login on FINALIZE

- Call `supabase.auth.signUp({ email, password: <generated-strong-password>, options: { emailRedirectTo: window.location.origin, data: { display_name, username, country, phone } } })`.

- Supabase's `Auto-confirm` is on (project memory), so session is returned immediately.

- Auto-claim of pending spin prize already runs in `Index.tsx` recovery effect.

- Redirect → `/profile`.

## Visual / Aesthetic

### Cyber-Industrial Tokens (inline + index.css additions)

- Background `#050505` with CSS scanline overlay `repeating-linear-gradient` 0 1px transparent, 2px rgba(255,255,255,0.02)).

- Cyan `#00F0FF` for borders, focus rings, lever rail.

- Orange `#FF5F00` for primary CTAs, prize reveal glow.

- Heavy shadows: `shadow-[0_0_40px_rgba(0,240,255,0.15),inset_0_0_20px_rgba(0,0,0,0.8)]`.

- Mechanical snap transitions: Framer Motion `{ type: 'spring', stiffness: 800, damping: 30 }`.

- Sliding-door for IDENTIFY: two panels slide L/R on enter.

- Vault wheel: re-skin `VaultSpinWheel` container with concentric rings, rivets (CSS dots), brushed-metal gradient.

- Draggable lever: vertical `motion.div` with `drag="y"`, snaps and triggers spin when dragged past threshold.

### Mobile

- Email input → `inputMode="email"`, `autoComplete="email"`, `autoFocus`.

- Phone → `inputMode="tel"`, `autoComplete="tel"`.

- Username → `autoComplete="username"`, `autoCapitalize="none"`.

- Full name → `autoComplete="name"`.

## Constraints Honored

- **No skip button** anywhere in the flow.

- Gate only bypassable for already-authenticated users or `localStorage.gate_completed === '1'`.

- Single login: signUp → auto-session → `/profile` (no second auth screen).

## File Plan

| File | Change |

|------|--------|

| `src/components/SpinWheelOverlay.tsx` | Full rewrite as 5-state machine; remove skip CTAs; add lever; integrate handleLeadUpdate; auto-signUp on FINALIZE |

| `src/components/promotion-gate/EmailGateStep.tsx` | **New** — INITIAL step, Zod email + denylist, autoFocus |

| `src/components/promotion-gate/IdentifyStep.tsx` | **New** — sliding-door Barber/Fan selection |

| `src/components/promotion-gate/VaultWheelStep.tsx` | **New** — wraps `VaultSpinWheel` with mechanical chassis + draggable lever |

| `src/components/promotion-gate/RewardStep.tsx` | **New** — holographic neon prize box |

| `src/components/promotion-gate/FinalizeStep.tsx` | **New** — Name/Username/Country/Phone form, signUp + auto-login |

| `src/components/promotion-gate/useGateState.ts` | **New** — state machine + localStorage persistence + handleLeadUpdate helper |

| `src/index.css` | Add `.cyber-scanlines`, `.vault-rivets`, `.holo-prize` utility classes + keyframes `mech-snap`, `lever-pulse`) |

| `src/pages/Index.tsx` | Replace `sessionStorage('spin_wheel_shown')` check with `localStorage('gate_completed')` permanent flag; always show overlay for guests |

## Open Items (defer to implementation)

- `marketing_leads` already supports anon insert + fingerprint-based update RPC — **no migration needed**.

- Generated password for signUp will be a random 32-char string (user never sees/needs it; they'll use magic-link / password reset later if needed).

- Auto-confirm email is enabled per project memory — no email verification step blocks the redirect.

Add Password + Email Confirmation + Forgot Password to Promotion Gate

## Scope

Extend the previously approved Cyber-Industrial Promotion Gate plan with proper account security: user-chosen password, email confirmation, and a full forgot-password recovery flow.

## Changes

### 1. FINALIZE step — replace auto-generated password with user input

In `SpinWheelOverlay.tsx` finalize form, add:

- **Password** field (`type=password`, min 8 chars, show/hide toggle, `autoComplete="new-password"`)
- **Confirm Password** field (must match)
- Real-time strength check (length + at least one number)

On submit:

- Call `supabase.auth.signUp({ email, password, options: { emailRedirectTo:` ${window.location.origin}/`, data: {...} } })`
- Show success screen: **"Check your email to confirm your account"** with the prize info preserved
- Save prize to `localStorage.pending_spin_prize` so it auto-claims after the user confirms email and lands back on the app (existing logic in `Auth.tsx` already handles this)
- Set `localStorage.gate_completed = '1'` so they don't see the gate again

### 2. New page: `/reset-password` (`src/pages/ResetPassword.tsx`)

Public route. On mount:

- Read URL hash for `type=recovery` (Supabase recovery link format)
- Show form: New Password + Confirm New Password (same validation as signup)
- Call `supabase.auth.updateUser({ password })`
- On success → toast + redirect to `/`

### 3. New component: `ForgotPasswordForm.tsx`

- Single email input + "Send reset link" button
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo:` ${window.location.origin}/reset-password `})`
- Cyber-industrial styling (dark, cyan/orange accents) to match the gate
- Success state: "Check your email for the reset link"

### 4. Wire forgot-password into existing sign-in surfaces

- `SignInForm.tsx` and `AuthDialog.tsx`: add **"Forgot password?"** link below the password field that opens the `ForgotPasswordForm` (modal/inline swap)
- `Auth.tsx` page: add the same link

### 5. Routing

- `src/App.tsx`: register `<Route path="/reset-password" element={<ResetPassword />} />` as a public route (outside `AuthGuard`)

### 6. Email confirmation handling

- The default Supabase confirmation email is sufficient — no template scaffolding needed unless the user requests branded emails later.
- After clicking the confirmation link, Supabase redirects to `${window.location.origin}/`, where `Index.tsx`/`Auth.tsx` already auto-claim the pending spin prize and navigate to `/profile`.

## File Plan


| File                                         | Change                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/SpinWheelOverlay.tsx`        | Add password + confirm-password fields to FINALIZE; remove auto-generated password; switch success state to "check your email" |
| `src/pages/ResetPassword.tsx`                | **New** — public page that handles `type=recovery` and updates password                                                        |
| `src/components/auth/ForgotPasswordForm.tsx` | **New** — email input + `resetPasswordForEmail` call, cyber-industrial styling                                                 |
| `src/components/auth/SignInForm.tsx`         | Add "Forgot password?" link that swaps to ForgotPasswordForm                                                                   |
| `src/components/auth/AuthDialog.tsx`         | Mount ForgotPasswordForm view alongside sign-in/sign-up tabs                                                                   |
| `src/pages/Auth.tsx`                         | Add "Forgot password?" link                                                                                                    |
| `src/App.tsx`                                | Register `/reset-password` public route                                                                                        |


## Notes

- No DB migration needed — Supabase Auth handles password storage and recovery tokens natively.
- Email confirmation is already enabled by default; users will receive Supabase's default confirmation email until/unless branded auth templates are scaffolded (separate request).
- Password validation: min 8 chars, must contain at least one number — enforced client-side; Supabase enforces its own server-side minimum.