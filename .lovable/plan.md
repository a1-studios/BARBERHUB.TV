

# Center Play Buttons in Hero Card Boxes

## Problem

The play buttons (rotating barber pole icons) inside each hero card appear off-center. This happens because the `BarberVideoSection` placeholder applies both `aspect-video` and `h-full` simultaneously. When `h-full` forces the container to match the parent's height, the `aspect-video` ratio constrains its width, making the container narrower than the card. The "centered" content then sits in the center of this narrower box, not the visual center of the card.

## Root Cause

In `src/components/barber/BarberVideoSection.tsx`, the aspect ratio class is always computed:

```tsx
const aspectClass = aspectRatio === 'portrait' ? 'aspect-[9/16]' : 'aspect-video';
```

But the hero cards pass `className="rounded-lg h-full border border-cyan/10"` which includes `h-full`. These two properties fight each other -- `h-full` wins for height, but `aspect-video` then forces a narrower width, creating an off-center appearance.

## Fix

**File: `src/components/barber/BarberVideoSection.tsx`**

Update the `aspectClass` logic to detect when `h-full` is in the className and skip the aspect ratio, using `w-full h-full` instead. This ensures the placeholder fills the entire card area, making the centered play button truly centered.

Change the aspect class calculation (around lines 35-39):

```tsx
// Before
const aspectClass = className.includes('aspect-square') 
  ? 'aspect-square' 
  : aspectRatio === 'portrait' 
    ? 'aspect-[9/16]' 
    : 'aspect-video';

// After
const hasExplicitHeight = className.includes('h-full') || className.includes('h-[');
const aspectClass = hasExplicitHeight
  ? 'w-full h-full'
  : className.includes('aspect-square') 
    ? 'aspect-square' 
    : aspectRatio === 'portrait' 
      ? 'aspect-[9/16]' 
      : 'aspect-video';
```

When `h-full` is detected in the className, the component uses `w-full h-full` to fill the parent in both directions. Otherwise, it falls back to the original aspect ratio behavior (used on profile pages, etc.).

This single change fixes centering for all three placeholder states in the component (the owner upload UI, the arena placeholder, and the video embed) because they all use `aspectClass` for their container sizing.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/barber/BarberVideoSection.tsx` | Detect `h-full` in className and skip aspect ratio constraint, use `w-full h-full` instead |

No changes to `DynamicBattleHero.tsx` or any other consumer files.

