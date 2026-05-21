
# Profile + Onboarding Audit — Phased Plan

Scope: profile hero layout, fan profile editing, social-link prompts, phone capture, nationality lock, empty-space cleanup, and One Tap raffle parity.

---

## Phase 1 — Fan profile hero parity (visual only)

**Files:** `src/pages/Profile.tsx`

- Bring the fan avatar+SocialOrbit block **down** below the header so it visually matches the barber view (remove `-mt-3`, switch `pt-8` to `pt-12`, add `mt-2` on the orbit row).
- Keep the orbit/avatar size unchanged (radius 71, 101px avatar).
- Re-verify centering at 390px (current viewport) — orbit container `mx-auto` + parent `justify-center`.

Acceptance: fan hero sits the same vertical distance from the BARBER-HUB header as the barber hero; avatar perfectly centered on mobile.

---

## Phase 2 — Fan profile editing: avatar + social channels

**Files:**
- `src/pages/Profile.tsx` (wire actions)
- `src/components/profiles/SocialOrbit.tsx` (own-profile "add" affordance)
- new: `src/components/profiles/SocialLinksDialog.tsx` (single dialog: IG / FB / X / YT inputs)
- new: `src/components/profiles/FanAvatarEditButton.tsx` (reuses existing `AvatarUpload` storage logic)
- DB: extend `client_profiles` with `instagram_handle`, `facebook_handle`, `twitter_handle`, `youtube_handle` if missing (barber_profiles already has them).

Behavior (applies to **both fans and barbers** for unmapped slots):
- Tapping a **lit** social icon → opens the link (current behavior).
- Tapping a **greyed/unmapped** icon **on own profile** → opens `SocialLinksDialog` pre-focused on that network.
- Fan avatar: tap own avatar → opens upload picker (same flow as `AvatarUpload`).

Acceptance: fan can upload an avatar and connect/disconnect IG/FB/X/YT from the profile screen; orbit icons light up after save.

---

## Phase 3 — Phone number capture + persistence audit

**Files:**
- `src/components/coming-soon/StepFanDetails.tsx`, `StepBarberDetails.tsx` — confirm phone is collected and passed.
- `supabase/functions/submit-role-details/index.ts` — ensure `phone_number` is written to `profiles` (and `barber_profiles` for barbers).
- `src/components/profiles/ClientProfileForm.tsx` + new fan settings panel — expose phone editor for fans.
- DB migration: add `phone_number TEXT` + `phone_country_code TEXT` to `profiles` if not present; backfill from `barber_profiles` where applicable.

Acceptance: phone entered at signup or profile edit is queryable in `profiles.phone_number`; no silent drops.

---

## Phase 4 — Nationality lock after signup

**Files:**
- DB: add `country_locked_at TIMESTAMPTZ` to `profiles`; trigger sets it on first non-null `country_code`.
- RLS / update policy: block client updates to `country_code` when `country_locked_at IS NOT NULL` (only service-role/admin can override via `sovereign-user-control`).
- `src/components/profiles/ClientProfileForm.tsx`, `BarberSettings.tsx`, fan settings — render country field as **read-only** with a small "Locked at signup — contact support" hint when locked.
- `submit-role-details` — set country once, then ignore subsequent country changes.

Acceptance: once country is set, user cannot change it from the UI or API; admin override path remains.

---

## Phase 5 — Layout polish + One Tap raffle parity

**5a. Empty-space / landing-position cleanup**
- Audit pages: `Profile`, `WatchFeed`, `Rankings`, `Portal`, `BarbersDirectory`, `CreatorHub`, `Tournaments`, `BattlesPage`.
- Standardize main wrapper: `pt-[calc(env(safe-area-inset-top)+56px)]` (header height) and remove negative margins.
- Remove trailing empty scroll regions (collapse `min-h-[calc(...)]` flex spacers that produce blank scroll below content on short pages).
- Ensure every route lands with the BARBER-HUB header at top and first content card immediately under it (no >24px gap, no scroll-past-end overshoot).

**5b. Google One Tap raffle parity** (`src/components/auth/GoogleOneTap.tsx`)
- Today: One Tap users only get a ticket *if one was claimed pre-signin*. Email users get the spin in `StepRaffleSpin` before account creation.
- New: after successful `signInWithIdToken`, if `localStorage` has no `raffle_pending_claim`, call `claim-raffle-ticket` server-side using the Google email + device fingerprint, then call `link-raffle-to-user` with the returned `ticket_code`.
- UX: surface a lightweight post-One-Tap modal (`PostSignupRaffleReveal`) that runs the same `ScrollMorphHero` spin animation and shows the awarded ticket — so One Tap users see the same celebration as email users.
- Guardrails: skip if `claim-raffle-ticket` returns "already claimed" for this email/fingerprint; respect dedupe rules already in the edge function.

Acceptance: a fresh Google One Tap signup ends with a spinning wheel and a raffle ticket on their account, identical to the email path.

---

## Technical notes

- All DB changes via `supabase--migration`; no edits to `auth.*` schema.
- Country lock enforced both client-side (read-only UI) and server-side (RLS + edge function guard) — defense in depth.
- Social links live on existing `*_profiles` tables; orbit reads from whichever role table applies (already wired).
- `SocialLinksDialog` will use a shared `useSocialLinks(role)` hook to read/write the correct table.
- Raffle reveal modal mounts only when One Tap completes with a *new* ticket, never on repeat sessions.

## Out of scope
- Redesign of `SocialOrbit` visuals, AvatarCrest, or header.
- Booking/economy/business logic.
- Migrating barber social fields to a unified table.
