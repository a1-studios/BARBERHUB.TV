# Profile Hero Layout Fix

## Problem
Current hero uses an absolute-positioned avatar inside a 164px container with side rails. This causes:
- Specialties (left rail) and Votes/Power (right rail) get clipped/misaligned because the orbit's padding overlaps them
- Name/bio row sits under a `-mt-6` and collides with the avatar bottom (name "disappears")
- No breathing space between avatar block and the Share Location toggle
- Votes/Power labels render at top, not vertically centered with the avatar

## Goal
Keep the avatar + orbit + M4M heart visually intact (same size, same position relative to header), but give specialties, name, and votes/power their own clean rows.

## New Structure

```
┌─────────────────────────────────────────┐
│  Header (existing)                       │
├─────────────────────────────────────────┤
│ [Specialty]           [Votes]            │  ← Row 1: rails flank avatar
│ [Specialty]   AVATAR  [Power]            │     (true 3-col grid, not absolute)
│ [Specialty]  +ORBIT   [Likes]            │
│ [Specialty]   +HEART                     │
│                                          │
│            Display Name ✎                │  ← Row 2: name (small gap)
│         @username 🇺🇸 [Fan]               │
│              short bio                   │
│                                          │
│      [ Share My Location toggle ]        │  ← Row 3
│      ... rest of page ...                │
└─────────────────────────────────────────┘
```

## Changes (src/pages/Profile.tsx, lines ~290-394)

1. **Replace absolute-positioned hero with a real 3-column grid**
   - `grid grid-cols-[minmax(80px,1fr)_auto_minmax(80px,1fr)] items-center gap-2`
   - Center column = SocialOrbit (unchanged size: radius 71, iconSize 28, AvatarCrest size lg, 101px avatar)
   - Left column = specialties stacked vertically, `items-start`, vertically centered against avatar (`self-center`)
   - Right column = Votes/Power (or Foll/Likes/Don for barbers) stacked vertically, `items-end`, `self-center`
   - Remove `absolute`, `min-h-[164px]`, `-translate`, and the mobile `scale-[0.9]` (the orbit's own padding already handles spacing)

2. **Fix name row spacing**
   - Remove `-mt-6` on the name container — replace with `mt-1` so the name sits cleanly below the orbit instead of overlapping it

3. **Add gap before Share Location**
   - Add `mt-2` to the LocationQuickToggle wrapper so it doesn't hug the name/bio

4. **Tighten rail typography for the 390px viewport**
   - Specialties: keep `text-[11px]`, ensure `leading-tight` and `truncate` to prevent wrap-breaking the grid
   - Votes/Power numbers: keep `text-base` but reduce vertical gap from `gap-1.5` → `gap-2` so the 2 (fan) or 3 (barber) items distribute evenly alongside the avatar height

5. **Remove now-unused container styles**
   - Drop `min-h-[164px] pb-0` and the wrapper `-mt-6` on the hero (the grid will size itself naturally — ~145px tall)

## Out of scope
- No changes to SocialOrbit, AvatarCrest, M4MAvatarBadge components
- No changes to lower sections (Tools, Notifications, Account, Install App)
- No data/business logic changes