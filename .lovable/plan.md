

## Goal
Make the WelcomeModal **30% more compact**, mobile-optimized, with a **bright cyan accent edge**, and split into two distinct flows:
1. **First-time users**: Full "Welcome to the Arena" onboarding modal — but **only triggered when they enter the battle arena** (i.e., after picking a category / entering a battle), not on landing.
2. **Returning users**: A small, lightweight **"Welcome back, {name}"** toast/strip — no big modal, no steps.

## Changes

### 1. `WelcomeModal.tsx` — slim down + cyan edge + dual mode
- **Add `mode` prop**: `'first-time' | 'returning'` (default `'first-time'`).
- **Size reduction (~30%)**:
  - `sm:max-w-md` → `sm:max-w-sm` (narrower).
  - Trophy badge: `h-16 w-16` → `h-12 w-12`; inner icon `h-8 w-8` → `h-6 w-6`; `mb-4` → `mb-2`.
  - Title: `text-2xl` → `text-lg`; flag `text-3xl` → `text-xl`.
  - Description: `text-base` → `text-xs`.
  - Steps container: `space-y-4 py-4` → `space-y-2 py-2`; each row `p-3` → `p-2`, `gap-4` → `gap-3`.
  - Step icon circle: `h-10 w-10` → `h-8 w-8`; icon `h-5 w-5` → `h-4 w-4`.
  - Step title: default → `text-sm`; description: `text-sm` → `text-xs`.
  - Step number: `text-2xl` → `text-lg`.
  - Buttons: default → `size="sm"`, icons `h-4 w-4` → `h-3.5 w-3.5`.
  - Footer "Don't show again": `text-xs` → `text-[10px]`, `mt-2` → `mt-1`.
- **Cyan edge accent** (using existing brand cyan `#22D3EE` / `secondary`):
  - Add a 2px cyan ring around the `DialogContent`: `ring-2 ring-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.25)]`.
  - Trophy badge gets a thin cyan inner ring to tie it together.
- **Mobile**: stays full-width on mobile via existing dialog defaults; tightened paddings ensure no overflow at 360px.
- **Typography cohesion**: standardize on `font-semibold` for titles, `text-muted-foreground` for body, single `tracking-tight` on title for a unified rhythm.

### 2. New "Returning user" branch inside same component
When `mode === 'returning'` (or auto-detected: `localStorage.barberhub_welcome_seen === 'true'` AND user is signed in AND it's a fresh session):
- Render a **tiny centered card** — no steps list, no CTAs:
  ```
  ┌─────────────────────────────┐
  │  👋  Welcome back,           │
  │      {displayName} 🇩🇴       │
  └─────────────────────────────┘
  ```
- Auto-dismiss after 2.5s OR on click.
- Same cyan edge so the brand accent is consistent.
- Uses `sonner` toast instead of dialog for minimal disruption (lighter than a modal).

### 3. Trigger logic — move first-time modal off the landing page
- **Remove** `<WelcomeModal />` from `src/pages/Index.tsx` (line 201).
- **Add** `<WelcomeModal mode="first-time" />` to **`src/pages/Portal.tsx`** (the Battle Portal — what users hit after picking a category / entering the arena). The modal still self-gates via `localStorage.barberhub_welcome_seen` so it only fires once.
- **Add** the returning-user welcome-back toast trigger to `src/pages/Index.tsx`:
  - On mount, if `user` exists AND `localStorage.barberhub_welcome_seen === 'true'` AND `sessionStorage.welcome_back_shown !== 'true'` → fire `toast.success(\`Welcome back, ${displayName} ${flag}\`)` with cyan-accented styling, then set the session flag so it only shows once per session.

### 4. Cyan accent color source
Use the existing Tailwind `cyan-400` (`#22D3EE`) — it matches the platform's defined Zion Blue / cyan secondary accent already used elsewhere (per `mem://design/branding-colors-permanent`). Orange remains primary (Trophy gradient + buttons stay orange); cyan is **only** the edge halo.

## Files Touched

| File | Change |
|---|---|
| `src/components/onboarding/WelcomeModal.tsx` | Shrink all sizes ~30%, add cyan ring/glow edge, add `mode` prop with `'returning'` lightweight variant, tighten typography |
| `src/pages/Index.tsx` | Remove `<WelcomeModal />` mount; add returning-user welcome-back toast effect (cyan-styled, session-gated) |
| `src/pages/Portal.tsx` | Mount `<WelcomeModal mode="first-time" />` near the top of the Portal main content so it fires when users enter the battle arena |

## Out of Scope
- Changing the modal's underlying step content/copy (only sizing + accent).
- Touching the LaunchWizard intake flow.
- Adding new translations or a separate component file (one component, two modes keeps maintenance simple).

## Result
- First-time users entering the Battle Portal see a **tighter, mobile-clean** onboarding card framed by a glowing **cyan edge** — orange remains the dominant action color.
- Returning signed-in users hitting the home page get a **subtle "Welcome back, {name} 🇩🇴" toast** — no big modal, no friction.
- Modal footprint reduced ~30% (narrower max-width, smaller paddings, tighter typography) so it fits cleanly on 360px screens with zero scroll.

