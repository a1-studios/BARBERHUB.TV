

# Add Energetic Battle CTA Above Faction Banners

## Overview

Add a compact, high-energy description and "Join the Battle" call-to-action above the faction category banners. The section stays tight and minimalistic but packs visual punch using the existing orange/cyan glow system, subtle animated accents, and role-aware buttons.

## What Changes

### Update `ImmersiveFactionBanners.tsx`

A new CTA block is inserted **above** the banner row, inside the existing container. It includes:

1. **One-liner tagline** -- Short, punchy text like: *"Pick your faction. Rep your flag. Battle every Sunday."* -- styled with a subtle cyan text-shadow glow, keeping it minimal (no heading tag, just a `p` element).

2. **Role-aware CTA button** with energetic styling:
   - **Barbers**: "Join the Battle" button that opens the existing `TournamentRegistration` dialog. Uses a gradient orange background with a cyan glow hover effect and a `Trophy` icon.
   - **Fans**: "Watch the Battles" button that navigates to `/portal`. Uses an outline style with cyan border glow.
   - Both buttons use `framer-motion` for a subtle entrance animation (fade-up).

3. **Compact layout** -- The description + button sit in a tight `flex-col items-center gap-3` container with minimal padding (`py-2`), so they don't add vertical bloat. The entire section flows naturally into the banners below.

4. **Energy effects** -- A thin horizontal gradient line (orange-to-cyan-to-orange) separates the CTA from the banners, matching the existing accent line pattern used in `SphereHolographicWrapper`. This line pulses subtly on a 3s loop.

## Technical Details

### File: `src/components/factions/ImmersiveFactionBanners.tsx`

New imports:
- `Button` from `@/components/ui/button`
- `useUserRole` from `@/hooks/useUserRole`
- `TournamentRegistration` from `@/components/tournament/TournamentRegistration`
- `Trophy`, `Eye` from `lucide-react`

Changes inside the component:
- Call `useUserRole()` to get `isBarber`
- Add a new `motion.div` block above the existing banners `motion.div` containing:
  - A tagline paragraph with `text-sm sm:text-base text-muted-foreground` and a subtle cyan `text-shadow`
  - Conditional rendering:
    - If barber: render `TournamentRegistration` component (it self-contains the dialog trigger button -- we'll wrap it or use its dialog trigger)
    - If fan: render a `Button` with outline variant navigating to `/portal`
  - A decorative pulsing gradient divider line below the button

The existing banner row and all background glow effects remain completely untouched.

### Visual Layout

```text
           "Pick your faction. Rep your flag. Battle every Sunday."
                        [ Join the Battle ]
              -------- (pulsing gradient line) --------
        [Banner] [Banner] [Banner] [Banner] [Banner]
```

The entire addition is roughly 80-100px of vertical space, keeping the section compact.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/factions/ImmersiveFactionBanners.tsx` | Add tagline, role-aware CTA button, and decorative divider above banners |

No new files. No database changes. Reuses existing `TournamentRegistration`, `useUserRole`, and `Button` components.

