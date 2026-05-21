## Goal

Replace the current M4M heart-shield icon (rendered as a separate element under the profile picture) with the uploaded 3D orange/teal handshake-heart, and move it INSIDE the profile avatar as an overlay. Add a soft beating + fade in/out pulse every 6 seconds for certified barbers, and a faded "ghost" overlay for non-certified barbers. It must appear everywhere the barber's profile avatar is shown.

## Asset

- Copy `user-uploads://Gemini_Generated_Image_jgy9myjgy9myjgy9.png` -> `src/assets/m4m-handshake-heart.png`
- Import as ES6 module wherever rendered.

## New component

Create `src/components/m4m/M4MAvatarBadge.tsx`:
- Props: `certified: boolean`, `paid: boolean`, `livesTouched`, `barberName`, `barberUserId`, `isOwnProfile`, `size` (`xs | sm | md | lg`).
- Renders an absolutely positioned overlay (bottom-right of the avatar container, ~28–34% of avatar size) containing the handshake-heart PNG.
- States:
  - **Not certified** -> ghost: render with `opacity-15`, grayscale, no animation. Still clickable, still opens the same modals as today.
  - **Certified (with or without paid)** -> full color, drop-shadow halo (orange/teal glow), wrapped in a `motion.div` that runs a 6s loop: scale 1 -> 1.12 -> 1 (two quick beats over 0.9s) and opacity 0 -> 1 -> 1 -> 0 fade over the same 6s cycle.
- Reuses the three existing modals (`M4MVerificationModal`, `M4MCertificationModal`, `M4MQRCodeModal`) and their open/close logic, preserving today's click behavior (own-profile uncertified -> certification; own-profile certified -> QR; other -> verification).

## Animation

Add a keyframe utility in `src/index.css` (HSL tokens / no raw color):
```
@keyframes m4m-pulse {
  0%   { transform: scale(1);    opacity: 0; }
  10%  { transform: scale(1.12); opacity: 1; }
  18%  { transform: scale(1);    opacity: 1; }
  26%  { transform: scale(1.08); opacity: 1; }
  34%  { transform: scale(1);    opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: scale(1);    opacity: 0; }
}
.animate-m4m-pulse { animation: m4m-pulse 6s ease-in-out infinite; }
```
(Framer-motion option is fine too; CSS keeps it cheap on cards/lists.)

## Integration points (remove the old external heart, mount inside avatar)

1. `src/components/AvatarCrest.tsx`
   - Accept new optional props `m4m_certified`, `m4m_paid`, `m4m_lives_touched`, `barberName`, `barberUserId`, `isOwnProfile`.
   - Render `<M4MAvatarBadge />` absolutely positioned inside the crest container (bottom-right, above the rings, under the live indicator if any) so it follows the avatar everywhere it renders.

2. `src/components/barber/BarberProfileHeader.tsx`
   - Wrap the `<Avatar>` in a `relative` container and render `<M4MAvatarBadge size="lg" .../>` as an overlay on the avatar.
   - **Delete** the existing `<M4MHeartbeat ... />` block currently sitting under the avatar (lines ~122–130) and the surrounding `flex flex-col items-center gap-1` wrapper collapse.

3. `src/components/barber/BarberProfileCard.tsx`
   - Same swap: remove the standalone `<M4MHeartbeat />` (line ~197) and instead render `<M4MAvatarBadge size="sm" />` overlaid on the card's avatar.

4. Anywhere else `AvatarCrest` is used for a barber (Watch feed action stack, Map pins popovers, Battle theater, etc.) automatically inherits the badge because it lives inside the crest. No further edits needed.

## Deprecation

- Keep `src/components/m4m/M4MHeartbeat.tsx` in place but stop importing it from header/card. (Safe deletion can follow once we confirm no other route imports it — grep shows only the two above.)

## Visual spec

- Badge sits at bottom-right, ~30% of avatar diameter, with a 2px transparent inset so it overlaps the avatar edge slightly.
- Certified halo: `drop-shadow(0 0 6px hsl(var(--primary)/0.6)) drop-shadow(0 0 12px hsl(var(--accent)/0.4))`.
- Ghost: `grayscale opacity-15` with no halo.
- Cursor pointer always; tap targets unchanged.

## Acceptance

- Profile page, barber cards, watch feed, and any map/battle avatars all show the handshake-heart inside the avatar.
- No heart is rendered below the avatar anywhere.
- Certified barbers' badge beats and softly fades on a calm 6-second cycle.
- Non-certified barbers show a faint ghost overlay only.
- Tapping the badge still opens the existing verification / certification / QR modals as today.
