# Fix profile-completion follow-through + add social sign-in shortcuts

Two small, scoped changes — frontend only, no business logic touched.

## 1. Persistent "Complete your profile" prompt

Today, if a OAuth user dismisses the `ProfileCompletionGate` ("Watch first, decide later"), nothing reminds them — and their Barber Bucks ticket can't be credited until role + country are set. Add a permanent reminder until the profile is completed.

**A. Sticky banner on the Profile page (`src/pages/Profile.tsx`)**

- At the top of `<main>`, render a dismissible-but-persistent orange banner whenever `!profile?.user_type || !profile?.country_code`.
- Copy: "Complete your profile to claim your Barber Bucks 🎟️" + a "Complete now" button that calls `requireProfileComplete()` (re-opens the existing gate modal).
- Style: orange gradient, pulsing ring, sits above the avatar hero so it's the first thing they see.

**B. Header pulse dot (`src/components/Header.tsx`)**

- Add a small orange pulsing dot on the profile coin (similar to the existing `unreadCount` badge, but distinct color/position) when the profile is incomplete.
- Tapping the coin still opens the wallet dropdown; we add a new "⚠️ Complete profile" row at the top of that dropdown that triggers `requireProfileComplete()`.
- Uses the same query the gate uses (`profiles.user_type` + `country_code`) wrapped in a tiny `useProfileIncomplete()` hook so both Header and Profile share one source of truth.

**C. Auto re-trigger on app focus**

- `ProfileCompletionGate` already auto-opens 800 ms after sign-in. Extend its `useEffect` so it also re-opens once per session if the user navigates to `/profile`, `/portal`, or `/creator-hub` while incomplete (read-only — no DB changes).

No edge function or DB changes — `finalize-oauth-claim` already handles linking the lead to the user and crediting BB once the form is submitted.

## 2. Small social sign-in icons under the header (logged-out users)

A new lightweight strip rendered just under the header for users who are **not signed in**, so OAuth is always one tap away (matches the one-click pattern from the intake flow).

**New component: `src/components/auth/QuickSocialSignIn.tsx**`

- Three small (28 px) circular icons: Google, Apple, Meta — same SVGs as `StepIdentityHook`'s `SocialCircle`, scaled down.
- Reuses the same `signInWithOAuth(...)` call with `authCallbackRedirect()`.
- Subtle row: `flex items-center justify-center gap-3 px-4 py-1.5` with a tiny "Sign in:" label on the left.
- Hidden when `user` exists.

**Mount point: `src/components/Header.tsx**`

- Render `<QuickSocialSignIn />` directly under the closing `</div>` of the header bar, before the `<LiveActivityPill />`. It sits flush under the rounded header card so it reads as part of the chrome.
- Mobile-first: icons are 28 px, total strip height ~36 px, no horizontal scroll.

## Files touched

- `src/pages/Profile.tsx` — sticky completion banner.
- `src/components/Header.tsx` — pulse dot, dropdown row, mount social strip.
- `src/components/auth/ProfileCompletionGate.tsx` — re-open on protected route visits.
- `src/hooks/useProfileIncomplete.tsx` — **new**, shared incomplete-check.
- `src/components/auth/QuickSocialSignIn.tsx` — **new**, small icon row.

No database, RLS, or edge function changes.  ensure the users barbers are eble to imput their flag phone and all the agreed info when they completing their account last build was having issues 