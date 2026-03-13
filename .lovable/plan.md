

## Profile Page: Flag Banner Background + Layout Polish

### Changes

**1. `src/pages/Profile.tsx`** — Two main updates:

**A) Full-page flag banner background at 35% opacity**
- Use the user's `countryCode` to render an SVG flag behind the entire profile page
- Use `flagcdn.com` to fetch flag images: `https://flagcdn.com/w1280/{code}.png`
- Render as a full-screen `position: fixed` background image behind all content, rotated 90deg (vertical/banner orientation), at `opacity-[0.35]`
- The flag covers the entire viewport from header to bottom nav, sitting behind all UI elements
- Apply a subtle dark gradient overlay on top of the flag to ensure text readability

**B) Move Edit/Settings/Public buttons into the iOS grouped list**
- Remove the standalone action pills row from the middle of the page
- Add Edit, Settings, and Public Profile as rows inside the "Account" grouped list section (small icon + text, chevron right)
- This frees up vertical space and keeps the important stats/avatar area clean
- The Sponsor button for fans also moves into the grouped list

### Layout after changes:

```text
┌─────────────────────────────┐
│ [FLAG BACKGROUND 35% VERT] │ ← full page, rotated vertical
├─────────────────────────────┤
│ Header                      │
│      ┌──────────┐           │
│      │ AVATAR   │           │
│      │ CREST    │           │
│      └──────────┘           │
│      Display Name           │
│      @username · 🇺🇸        │
│      bio / social icons     │
│   ┌──────┬──────┬──────┐    │
│   │Stats │Stats │Stats │    │
│   └──────┴──────┴──────┘    │
│                             │
│  ─── TOOLS ─────────────────│
│  📋 Recent Transactions   > │
│  📅 My Appointments      > │
│  ─── ACCOUNT ───────────────│
│  ✏️ Edit Profile          > │ ← moved here
│  ⚙️ Settings              > │ ← moved here (barbers)
│  🔗 Public Profile        > │ ← moved here (barbers)
│  🏆 Become Sponsor        > │ ← moved here (fans)
│  🔴 Sign Out                │
│  🗑️ Delete Account          │
│                             │
│  [BB Pill centered]         │
│  BottomNavBar               │
└─────────────────────────────┘
```

### Technical details

- Flag image: `<div className="fixed inset-0 z-0 opacity-[0.35]"><img src={`https://flagcdn.com/w1280/${countryCode.toLowerCase()}.png`} className="w-full h-full object-cover rotate-90" /></div>`
- Dark overlay on top: `<div className="fixed inset-0 z-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />`
- All content gets `relative z-10` to sit above the flag
- Grouped list cards get `bg-card/80 backdrop-blur-sm` so the flag subtly shows through
- Fallback: if no `countryCode`, skip the flag background entirely

**Files changed:** `src/pages/Profile.tsx` only.

