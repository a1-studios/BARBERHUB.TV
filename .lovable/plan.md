

# Redesign Faction Banners as Universal Highlight Showcase

## Overview

Transform the faction banners area into a universal highlight section visible to **all users** (fans, guests, barbers). Instead of hiding categories from non-barbers or showing a stripped-down version, all users see the same **3 featured banners** as an engaging showcase -- similar to social media story highlights or feature cards. Barbers additionally see the full 5-banner row with join buttons above it.

## Current Issues

- Non-barbers see 3 banners that still look like "tournament registration cards" with entry fees, barber counts, and prize pools -- data that doesn't engage fans
- The "Featured Categories" header is generic and doesn't draw users in
- The banners display identical content regardless of audience, missing an opportunity to hook fans into the platform's competitive culture
- The layout feels like a barber-only feature that fans stumbled into

## What Changes

### 1. Universal 3-Banner Showcase (All Users)

Replace the current non-barber view with an engaging social-media-style highlight row that all users see. The 3 banners shift focus from "join the tournament" to "explore the action":

**Content per banner (non-barber view):**
- Category icon + name (keep)
- Top barber avatar with crown (keep -- this is the social hook)
- Replace "prize pool" emphasis with the **top barber's name** prominently displayed (like a social media featured creator card)
- Replace "X barbers" count with a social-style label: "Trending" / "Hot" / "Live" badge
- Replace "$50 Entry" with a contextual action label: "Watch Now" or "Explore" as a small pill at the bottom
- On tap, navigate to `/portal?category={id}` (keep existing behavior)

**Content per banner (barber view):**
- Keep the full current display with prize pools, participant counts, entry fees
- Keep the Join button above each banner
- Show all 5 categories

### 2. Section Header Redesign (All Users)

Replace the plain "Featured Categories" text with a more engaging, social-media-style header:
- Title: **"Top Arenas"** -- short, punchy, uppercase with cyan glow
- Subtitle: **"See who's dominating right now"** -- creates curiosity and FOMO
- A small "See All" link-button on the right side that navigates to `/portal` (only for non-barbers, since barbers already see all 5)

### 3. Layout Adjustments

- Non-barber 3-banner row: slightly larger banners since there are only 3 (increase max width usage and allow each banner to breathe)
- Add a subtle stagger animation where the center banner is slightly taller/elevated than the two flanking banners, creating a "podium" effect that naturally draws the eye
- Keep the existing background glow, hover particles, and electric arc effects -- they create the premium feel

## Technical Details

### File: `src/components/factions/ImmersiveFactionBanners.tsx`

Changes:
- Update the section header to show for **all users** (remove the `!isBarber` condition), with updated copy
- Add a "See All" button next to the header for non-barbers that navigates to `/portal`
- Keep the `displayCategories` logic (3 for non-barbers, 5 for barbers)
- Pass a new `viewMode` prop to `ImmersiveBannerCard`: `'showcase'` for non-barbers, `'compete'` for barbers
- Adjust the non-barber container to use `max-w-2xl lg:max-w-3xl` and slightly larger `gap-4 sm:gap-5`

### File: `src/components/factions/ImmersiveBannerCard.tsx`

Changes to the props interface:
- Add `viewMode?: 'showcase' | 'compete'` prop (defaults to `'compete'` for backward compatibility)

Changes to rendering based on `viewMode`:
- When `viewMode === 'showcase'`:
  - Show the top barber name below their avatar (truncated, `text-xs font-semibold`)
  - Replace the large prize pool amount with a smaller, secondary display
  - Replace the participant count with a "Trending" badge (using a `TrendingUp` icon from lucide)
  - Replace "$50 Entry" text with an "Explore" pill button styled with cyan outline
  - Hide the Join button (already gated by `isBarber`, but also skip for clarity)
  - Make the center banner (index 1) slightly taller: add 20px extra height via conditional class

- When `viewMode === 'compete'` (barber view):
  - Everything stays exactly as it is now -- prize pools, barber counts, entry fees, join buttons

### Visual Layout

For non-barbers (showcase mode):
```text
         Top Arenas                    [See All ->]
    See who's dominating right now

   [Banner]      [Banner]      [Banner]
   (shorter)     (tallest)     (shorter)
    
   Avatar         Avatar        Avatar
   "DJ Cuts"     "FadeKing"    "BladeArt"
   Signature     Creative      Beard &
    Style         Color        Scissor
   Trending      Trending      Trending
   [Explore]     [Explore]     [Explore]
```

For barbers (compete mode -- unchanged):
```text
  [Join] [Join] [Join] [Join] [Join]
  [Ban1] [Ban2] [Ban3] [Ban4] [Ban5]
   ...full prize pools, counts, fees...
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/factions/ImmersiveFactionBanners.tsx` | Universal header, "See All" link, pass `viewMode` prop, layout tweaks |
| `src/components/factions/ImmersiveBannerCard.tsx` | Add `viewMode` prop, conditional content rendering for showcase vs compete modes |

No new files. No database changes. No edge function changes.

