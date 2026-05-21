# Dynamic Morphing Header

Replace the static "BARBER-HUB" brand text in `src/components/Header.tsx` with a smart morphing title that reflects the current page, surfaces transient notifications inline, and shows a small page-context icon below the bar. Keep header height, padding, logo, and the BB coin dropdown exactly as they are today.

## 1. Page title registry

New file `src/config/pageTitles.ts` exporting a route → `{ first, second, icon }` map (icon = lucide component).

Examples:
- `/` → `BARBER` / `HUB` (Scissors)
- `/barbers` → `BARBER` / `DIRECTORY` (MapPin)
- `/creator-hub` → `CREATOR` / `HUB` (Crown)
- `/portal` → `BATTLE` / `PORTAL` (Zap)
- `/watch` → `WATCH` / `FEED` (Play)
- `/tournaments` → `TOURNAMENT` / `ARENA` (Trophy)
- `/profile` → `MY` / `PROFILE` (User)
- `/rankings` → `GLOBAL` / `RANKINGS` (BarChart)
- `/vault` → `VAULT` / `OF HONOR` (Shield)
- `/studio` → `CAMERA` / `STUDIO` (Camera)
- `/admin*` → `ADMIN` / `CONTROL` (Shield)
- `/sovereign-hq` → `SOVEREIGN` / `HQ` (Crown)
- Dynamic patterns (`/barber/:userId`, `/battles/:id`, `/battle/:id/theater`, `/tournaments/:id`) resolved via small `matchTitle(pathname)` helper with regex fallbacks.
- Unknown route → `BARBER` / `HUB` default.

First word always white, second always Signature Orange (`text-primary`). Two-color rule lives in the renderer, not in the registry.

## 2. Header announcement bus

New file `src/lib/headerAnnouncements.ts`:

```ts
type Announcement = { first: string; second: string; durationMs?: number };
export function announce(a: Announcement): void;        // dispatch CustomEvent('header:announce')
export function useHeaderAnnouncement(): Announcement | null; // hook with internal timer (default 3500ms)
```

Single active announcement at a time; new announcements replace the current one and reset the timer. When the timer elapses, hook returns `null` and the title morphs back to the page title.

## 3. Header renderer changes (`src/components/Header.tsx`)

- Replace the centered brand `<button>` with a new `<DynamicHeaderTitle />` component (in the same file or `src/components/header/DynamicHeaderTitle.tsx`).
- `DynamicHeaderTitle` reads `useLocation().pathname`, resolves via `matchTitle`, and overlays `useHeaderAnnouncement()` when active.
- Uses `framer-motion` `AnimatePresence` with `mode="wait"`, key = `announcement ?? pathname`, fade + subtle y-translate (200ms). No layout shift.
- Auto-fit font size: container has fixed height matching current brand (`text-xl sm:text-2xl`). Use a `useFitText` ref hook that measures `scrollWidth` vs `clientWidth` and scales `font-size` down (CSS `transform: scale()` on the inner span) until it fits, clamped to a min of 12px. Re-run on resize and content change.
- Clicking the title still navigates to `/` (preserve current behavior).

Sub-header icon row:
- Render a tiny strip directly under the header `<header>` element (inside the same fixed wrapper) showing the page icon + lowercase page slug (e.g. `· barber directory`). Height ~20px, `text-[10px] text-muted-foreground`, centered, fades in/out with the title. Hidden when an announcement is active so it doesn't compete.
- Pure visual; does not affect the existing `top-[88px] sm:top-[104px]` offset used by `QuickSocialSignIn` — keep that offset unchanged. The icon row sits inside the header pill so total visual height grows by ~20px but the social strip's fixed offset stays as-is (verify visually; if it clips, bump the offset by the same delta in one place).

## 4. Wiring announcements (replace noisy toasts)

Welcome-back announcement:
- In `src/hooks/useAuth.tsx` (or wherever the current "Welcome back" toast fires), replace the `toast(...)` call with `announce({ first: 'WELCOME BACK', second: displayName?.toUpperCase() ?? 'FRIEND' })`. Remove the toast.

Remove redundant action-confirmation toasts (the user already saw the action succeed):
- `src/hooks/useLikes.tsx` — drop the `toast.success("Liked!" / "Like removed")` in `toggleLike.onSuccess`. Keep the error toast.
- Follow toast: search for `toast.success('Followed'` / `'Following'` / `'Unfollowed'` in `src/hooks/` and `src/components/` and remove those success calls; keep error toasts.
- Leave informational/critical toasts (payments, errors, challenge received, BB awarded, etc.) alone.

Notification system (`useNotifications`) is unchanged — incoming `challenge_received`, payouts, etc. still toast as today. Only the chatty success confirmations and the welcome toast move into the header.

## 5. Files touched

Created:
- `src/config/pageTitles.ts`
- `src/lib/headerAnnouncements.ts`
- `src/components/header/DynamicHeaderTitle.tsx`
- `src/hooks/useFitText.ts`

Edited:
- `src/components/Header.tsx` (swap brand text, mount title + sub-icon row)
- `src/hooks/useAuth.tsx` (welcome toast → announce)
- `src/hooks/useLikes.tsx` (drop success toasts)
- 1–2 follow hooks/components (drop follow success toasts)

## Out of scope

- No changes to logo, BB coin, notification panel, or QuickSocialSignIn strip.
- No new routes, DB, or edge functions.
- No changes to the existing real `notifications` table flow.
