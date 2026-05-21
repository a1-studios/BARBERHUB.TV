
## Goal

Rebuild the `/profile` layout (`src/pages/Profile.tsx`) so it feels premium and dense on a single iPhone screen. Avatar moves up tight under the header, specialties stack vertically on the left of the avatar, stats sit on the right, and every section shrinks vertically. Install App banner is hidden on desktop.

## Layout (mobile, 390px)

```text
┌──────────── Header ────────────┐
(pt-16, then minimal pt-2)

┌─────────────────────────────────┐
│  SPECIALTIES │   AVATAR   │STATS│
│  ✂️ Fades   │  + orbit   │ 1   │
│  💈 Classic │  M4M badge │ Foll│
│  💎 Luxury  │            │ 1   │
│             │            │ Like│
│             │            │ $0  │
│             │            │ Don │
└─────────────────────────────────┘
        loky 🇺🇸 @username
       (bio, one line, clamp-1)

[Share My Location toggle — compact]

TOOLS (denser rows, py-2)
 Recent Transactions          ›
 Manage Appointments          ›
 My Rewards                   ›

NOTIFICATIONS
 Push notifications      [⏻]
 Install App (md:hidden)

ACCOUNT (denser)
 Edit Profile & Settings      ›
 Public Profile               ›
 Sign Out
 Delete Account

         [ 🪙 25 BB + ]

────────── BottomNavBar ─────────
```

## Changes — `src/pages/Profile.tsx` only

### 1. Hero block (lines ~290–390): replace with 3-column grid

Replace the current centered avatar + centered specialties + centered stats sections with one `grid grid-cols-[auto_1fr_auto]` block:

- **Left column** — specialties stacked vertically, small pill badges. Hidden when no specialties (e.g. fans).
- **Center column** — `SocialOrbit` wrapping the `AvatarCrest`/`Avatar`. Shrink avatar from `lg` (h-28) to `md` (h-20/h-24) and reduce orbit `radius` from 70 → 56, `iconSize` 26 → 22 to free vertical space.
- **Right column** — stats stacked vertically (Followers / Likes / Donated for barbers; Votes Cast / Vote Power for fans). Use `text-base` numbers, `text-[9px]` labels.
- Hero wrapper goes from `pt-8 pb-2` → `pt-2 pb-1`.
- Name row stays below the grid, centered, but trimmed: `text-lg` instead of `text-xl`, `mt-1`. Bio clamps to 1 line (`line-clamp-1`).

### 2. Section spacing pass

- Section headers (`Tools`, `Notifications`, `Account`): change `pt-3` → `pt-2`, `pt-4` → `pt-2`.
- List rows inside `.bg-card/80` cards: change `px-4 py-3` → `px-3.5 py-2` for ~25% vertical reduction. Icons stay `h-4 w-4`, text stays `text-sm`.
- `LocationQuickToggle` wrapper — wrap with `text-sm` size if it currently renders larger; keep as-is otherwise.
- BB pill at bottom: `pt-4 pb-2` → `pt-2 pb-1`.

### 3. Hide Install App on desktop

Wrap `<InstallAppButton />` (line 470) with `<div className="md:hidden"><InstallAppButton /></div>`. Mobile keeps the prompt; tablet/desktop hides it. (PWA install only applies to mobile users anyway.)

### 4. Stats — vertical micro-version

New right-column markup (barber example):

```tsx
<div className="flex flex-col items-end gap-2 text-right">
  <div><div className="text-base font-bold leading-none">{followers}</div>
       <div className="text-[9px] text-muted-foreground uppercase">Foll</div></div>
  <div><div className="text-base font-bold leading-none">{likes}</div>
       <div className="text-[9px] text-muted-foreground uppercase">Likes</div></div>
  <div><div className="text-base font-bold text-primary leading-none">${donated}</div>
       <div className="text-[9px] text-muted-foreground uppercase">Don</div></div>
</div>
```

### 5. Specialties — vertical micro-version

```tsx
<div className="flex flex-col items-start gap-1.5">
  {parseSpecialties(specialty).map(id => /* small vertical Badge with emoji + label */)}
</div>
```

For fans (no specialties), render an empty `<div />` so the grid still centers the avatar correctly.

## Out of scope

- `BarberProfileHeader`, `BarberPublicProfile`, and `SocialOrbit` internals are not touched.
- No business-logic or data changes.
- No new components — purely layout/CSS reshuffle inside `Profile.tsx`.

## Acceptance criteria

- On 390×782 viewport, everything from header → BB pill fits within one screen without scrolling, *except* the collapsibles when expanded.
- Avatar visually rises ~3 lines higher than today (sits ~16px below header instead of ~80px).
- Specialties render as a left-aligned vertical stack next to the avatar.
- Stats render as a right-aligned vertical stack on the same row as the avatar.
- Install App button is invisible on `md` (≥768px) and visible on mobile.
- No horizontal overflow at 360–414px widths.
- Avatar remains perfectly centered within its own column (SocialOrbit unchanged).
