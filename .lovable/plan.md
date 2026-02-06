

# World Cup of Barbering -- Vertical Flag Banner Arena Redesign

## Vision

Transform the Battle Arena from flag-as-background into an Olympic-style layout where vertical country banners hang on either side of the arena, framing two enlarged video boxes. This creates a "stadium ceremony" aesthetic where the flags are prominent but never interfere with the video content.

## Current Layout

```text
+-------------------------------------------+
|  [Flag BG] Barber 1 Video  | VS | [Flag BG] Barber 2 Video  |
|  (flag behind everything)  |    | (flag behind everything)  |
+-------------------------------------------+
```

The flag currently fills the entire background of each barber's half, at 40% opacity, underneath the video. This dilutes the flag's impact and can visually clash with video content.

## New Layout

```text
+--+----------------------------------+--+
|  |                                    |  |
|FL|   Barber 1 Video    VS   Barber 2  |FL|
|AG|      (expanded)          Video     |AG|
| 1|                       (expanded)   | 2|
|  |                                    |  |
| V|                                    | V|
+--+----------------------------------+--+
```

Two vertical flag banners anchor the left and right edges with the shield-pointed bottom (matching faction banner geometry). The video containers expand into the freed-up space.

## Implementation Plan

### 1. Create `NationBanner` component

**New file: `src/components/battles/NationBanner.tsx`**

A vertical banner component that displays a country flag in a tall, narrow banner with:
- Shield-pointed bottom using the same `clipPath: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)` as the faction ImmersiveBannerCard
- Orange (#FF6B00) outer frame border matching the faction banner aesthetic
- Inner dark body with the country flag slightly desaturated (brightness 70%, saturation 80%) so the barber name text pops
- Barber name text displayed vertically (rotated 90 degrees, writing-mode vertical) in white, bold
- Subtle cyan energy glow from the bottom point, matching faction banner effects
- Responsive sizing: hidden on mobile (the vertical banner concept doesn't work on stacked mobile layout), visible from `sm:` breakpoint up
- Width: `w-14 sm:w-16 lg:w-20` -- narrow enough to not crowd the videos

Props:
- `countryCode: string` -- for the flag image
- `barberName: string` -- displayed vertically on the banner
- `side: 'left' | 'right'` -- determines text alignment and glow direction
- `isActive: boolean` -- enables pulsing/energy effects during live battles

### 2. Modify `DynamicBattleHero` layout

**File: `src/components/DynamicBattleHero.tsx`**

Restructure the main flex container to include the banners:

**Current structure:**
```text
<flex row>
  <barber1-half>    // flex-1, flag background inside
  <vs-divider>
  <barber2-half>    // flex-1, flag background inside
</flex>
```

**New structure (desktop):**
```text
<flex row>
  <NationBanner side="left" />     // fixed width, shield bottom
  <barber1-half>                   // flex-1, NO flag background
  <vs-divider>
  <barber2-half>                   // flex-1, NO flag background
  <NationBanner side="right" />    // fixed width, shield bottom
</flex>
```

Key changes:
- Remove the flag background `<div>` from each barber half (the `backgroundImage` overlay at 40% opacity)
- Remove the colored gradient overlay (`from-red-900/20 via-black/70`) since the flag is gone
- Replace with a clean dark gradient background for a more professional video-focused look
- Add NationBanner components on left and right edges
- Video containers naturally expand ~15% wider as they reclaim the banner's visual space
- On mobile: banners are hidden (`hidden sm:block`), layout remains stacked as-is with the existing flag backgrounds preserved for the full-bleed mobile experience

### 3. Style specifications

**Banner frame:**
- Outer: `border-2 border-primary/60` with the orange glow
- Inner: dark body `from-background/95 to-background/80`
- Flag image: `brightness-[0.7] saturate-[0.8]` for desaturation
- ClipPath: `polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)` -- same as faction banners

**Video area (desktop, post-banner):**
- Background: `bg-gradient-to-b from-card via-background to-card` -- clean dark, no flag
- The video itself becomes the visual focus with no competing background imagery

**Active state:**
- During live battles, banners get a subtle pulsing cyan glow at the bottom point
- Orange border brightness increases to full opacity

### 4. Mobile preservation

On mobile (below `sm:`):
- NationBanner components are hidden
- The existing flag-background approach is preserved for the stacked vertical layout (it works well at full-width mobile)
- This ensures no regression on the current mobile experience

## Files Modified

| File | Change |
|------|--------|
| `src/components/battles/NationBanner.tsx` | **New** -- Vertical flag banner with shield-bottom geometry |
| `src/components/DynamicBattleHero.tsx` | Add NationBanner on left/right; remove flag backgrounds on desktop; clean dark bg for video areas |

## Design Constraints Honored

- Banners never overlap video containers (fixed-width flex items)
- `#FF6B00` orange borders and `#00D9FF` cyan accents maintained
- VS divider remains the central focal point between videos
- Shield-pointed bottom matches faction banner visual language
- Video-first philosophy preserved: clean dark backgrounds maximize video focus
- Mobile layout untouched

