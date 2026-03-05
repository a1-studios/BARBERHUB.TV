

## Replace Subscription Badge with Animated Tier Ring Around Avatar

### Concept
Remove the static text badge ("Free", "Bronze", etc.) and replace it with a **glowing animated ring around the profile avatar** that visually represents the subscription tier. The ring uses distinct colors, animations, and LED-like effects per tier — making premium tiers immediately eye-catching and desirable.

When a barber without a subscription sees another barber's glowing profile ring, curiosity drives them to tap it. Tapping the ring (on own profile) or viewing another barber's profile opens the membership plans drawer.

### Tier Ring Visual Design

```text
Free:     Thin subtle border, no glow, no animation
Bronze:   Warm orange ring, gentle pulse glow, 2 LED dots orbiting
Silver:   Cool silver ring, shimmer sweep animation, 4 LED dots orbiting  
Gold:     Bright gold ring, intense glow + sparkle particles, 6 LED dots orbiting, continuous rotation
```

### New Component: `TierRing`
A wrapper around the Avatar that renders:
- A CSS-animated ring (border + box-shadow glow) colored per tier
- Small LED dots (pseudo-elements or tiny divs) that orbit the ring using CSS keyframe rotation
- On tap (interactive mode): opens the Membership Plans drawer (reuses existing `BarberSubscriptionTiers`)
- Non-interactive mode (viewing others): just shows the ring visually

### Changes

| File | Action |
|------|--------|
| `src/components/TierRing.tsx` | **Create** — New component wrapping Avatar with animated ring. Accepts `tier`, `size`, `interactive`, `children` (the Avatar). Uses CSS keyframes for orbit, glow pulse, and shimmer. Interactive mode opens a Drawer with `BarberSubscriptionTiers`. |
| `src/components/barber/BarberProfileHeader.tsx` | **Modify** — Wrap the Avatar in `TierRing` instead of rendering `SubscriptionBadge` as a text badge next to the name. Remove the `SubscriptionBadge` import and usage from line 136. |
| `src/components/barber/BarberProfileCard.tsx` | **Modify** — Wrap the Avatar in `TierRing` (non-interactive). Remove `SubscriptionBadge` text badge from line 208. |
| `src/pages/BarberPublicProfile.tsx` | **Modify** — Wrap Avatar in `TierRing` (interactive for visitors to see plans). Remove `SubscriptionBadge` from line 307. |
| `src/components/battles/BattleCard.tsx` | **Modify** — Small `TierRing` around barber avatars, non-interactive. Remove `SubscriptionBadge` lines 135 and 185. |
| `src/components/FeaturedCreatorCard.tsx` | **Modify** — Wrap Avatar in `TierRing`, remove `SubscriptionBadge` from line 200. |
| `src/components/booking/BookingConsole.tsx` | **Modify** — Wrap Avatar in `TierRing`, remove `SubscriptionBadge` from line 137. |
| `src/components/SubscriptionBadge.tsx` | **Delete** — No longer needed; drawer logic moves into `TierRing`. |

### TierRing Implementation Details

The component renders a relative container with:
1. **Ring**: A `div` with `rounded-full` and tier-specific border + box-shadow + animation
2. **LED dots**: 2-6 small absolute-positioned circles that rotate around the ring via CSS `@keyframes orbit`
3. **Avatar**: Passed as children, centered inside the ring
4. **Drawer**: Same membership plans drawer from current `SubscriptionBadge`, triggered on tap

CSS animations added to `index.css`:
- `@keyframes orbit` — rotates LED dots around the ring
- `@keyframes tier-glow-bronze/silver/gold` — pulsing glow per tier
- `@keyframes shimmer` — sweeping highlight for silver/gold

### Propagation
The `TierRing` component is used everywhere a barber avatar appears — profile headers, cards, battle views, booking — creating consistent visual identity across the platform.

