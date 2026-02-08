

# ArenaTicker: 50% Bigger with Bold Centered Ads

## Overview

Scale the ArenaTicker up by 50%, reduce the bottom padding of the DynamicBattleHero card (not the banner section) to close the gap, and make all ad content bold, centered with energetic spring animations.

## Where the Space Comes From

The gap between the battle hero videos and the ticker bar currently comes from two sources:
- `DynamicBattleHero` outer wrapper: `pb-2 sm:pb-4` (bottom padding)
- `ImmersiveFactionBanners` section: `py-10 sm:py-14` (top + bottom padding)

Per your request, the banner section padding stays unchanged. Instead, the DynamicBattleHero bottom padding gets removed entirely (`pb-0`) to pull the ticker closer to the video containers.

## What Changes

### 1. DynamicBattleHero -- Remove Bottom Padding

| Property | Current | New |
|----------|---------|-----|
| Outer wrapper padding | `pb-2 sm:pb-4` | `pb-0` |

This closes the gap between the video battle boxes and the ticker without touching the banner section spacing.

### 2. ArenaTicker -- 50% Bigger

| Property | Current | New |
|----------|---------|-----|
| Min height | `min-h-[48px]` | `min-h-[72px]` |
| Content padding | `px-3 sm:px-4 py-3` | `px-4 sm:px-6 py-5` |
| Progress bar | `h-1` | `h-1.5` |
| Dot size | `w-1.5 h-1.5` (active: `w-4`) | `w-2 h-2` (active: `w-5`) |

### 3. Bold Centered Text

All slide content becomes centered with bigger, bolder typography:

**Prize pool slides:**
- Trophy icon: `w-5 h-5` becomes `w-7 h-7 sm:w-8 sm:h-8`
- Amount: `text-base sm:text-lg lg:text-xl font-extrabold` becomes `text-xl sm:text-2xl lg:text-3xl font-black`
- "IN PRIZES" label: `text-[10px] sm:text-xs` becomes `text-xs sm:text-sm`
- Added continuous heartbeat pulse animation on the amount

**Sponsor ad slides:**
- Icon: `w-3.5 h-3.5` becomes `w-5 h-5`
- Message text: `text-xs sm:text-sm font-semibold` becomes `text-sm sm:text-base lg:text-lg font-bold`
- "Sponsored" badge: `text-[9px]` becomes `text-[10px] sm:text-xs`

**Layout:** Switch from `justify-between` to `justify-center`. The ChevronRight arrow is removed since it conflicts with centered design. All content wraps in a centered flex column.

### 4. Energetic Animations

Replace the subtle slide-up transitions with high-energy motion:

- **Prize pool entrance**: `initial={{ opacity: 0, scale: 0.8, y: 20 }}` with spring physics (`stiffness: 300, damping: 20`) -- punches in from below with a bounce
- **Prize pool pulse**: Continuous `scale: [1, 1.03, 1]` breathing animation on the dollar amount (2s loop)
- **Sponsor entrance**: `initial={{ opacity: 0, x: 30, scale: 0.95 }}` -- slides in from the right with spring bounce for visual variety
- **Exit (both)**: `exit={{ opacity: 0, scale: 1.1, y: -15 }}` with quick 0.2s ease-out -- "punch out" effect

## Files to Modify

| File | Change |
|------|--------|
| `src/components/DynamicBattleHero.tsx` | Remove bottom padding (`pb-2 sm:pb-4` to `pb-0`) on outer wrapper |
| `src/components/factions/ArenaTicker.tsx` | 50% height increase, centered bold text, energetic spring animations, remove chevron, larger dots and progress bar |

No changes to `ImmersiveFactionBanners.tsx`. No new files. No database changes. No new dependencies.
