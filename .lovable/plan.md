## Goal
Make the profile header feel cohesive by orbiting the social media icons in a ring around the avatar. Connected accounts glow in their brand color; unconnected accounts appear as faint ghost icons (still visible, but muted) so users can see what they can still link.

## What changes

### 1. New component: `src/components/profiles/SocialOrbit.tsx`
A circular "orbit" overlay that wraps the avatar.

- Props: `children` (the avatar), `socials` (array of `{ key, url, Icon, brandColor }`), `size` (avatar diameter), `radius?` (defaults to ~58% of size).
- Layout: a `relative` container sized to `size + 2*iconRadius`. The avatar sits centered. Each social icon is absolutely positioned on a circle using trig:
  - 4 icons (Instagram, Facebook, Twitter/X, YouTube) evenly distributed: angles at top, right, bottom, left (−90°, 0°, 90°, 180°) — clean compass layout.
  - Each icon: 28px circular chip with `bg-background/70 backdrop-blur border border-border/40`.
- Connected state (`url` present):
  - Full brand color icon (Instagram pink/gradient, Facebook blue, Twitter sky, YouTube red).
  - Subtle brand-color glow via `drop-shadow`.
  - Soft 3s pulse animation (opacity 0.85 → 1 → 0.85).
  - Wrapped in `<a target="_blank">`.
- Ghost state (no `url`):
  - `text-muted-foreground/35`, no glow, no animation.
  - On own profile: clickable → opens settings to add the link. On others: non-interactive, `cursor-default`.
- Mobile-safe: on viewports < 380px, slightly tighten radius so icons don't clip the card edge.

### 2. `BarberProfileHeader.tsx`
- Remove the existing `activeSocials` row (lines ~150–180) — the inline icon row under the name.
- Wrap the avatar block (currently `TierRing` + `M4MAvatarBadge` in a `relative` div) inside `<SocialOrbit socials={...} size={80 md:128}>`. M4M badge stays as-is (bottom-right overlay on the avatar itself, inside the orbit).
- Add extra padding to the parent flex container so the orbit's icon halo doesn't get clipped by `CardContent`.
- Pass `isOwnProfile` through so ghost icons can deep-link to settings when viewing own profile.

### 3. `Profile.tsx` (lines ~255 and ~351)
- Remove the standalone social icons row under the avatar.
- Apply the same `<SocialOrbit>` wrapper around the avatar shown on the fan/barber profile page.

### 4. `BarberPublicProfile.tsx` (line ~521)
- Remove the inline social row; rely on `BarberProfileHeader` now orbiting the icons.

## Visual spec
- Icon chip: 28×28 rounded-full, 1px border, blurred dark glass background.
- Connected glow colors (HSL): Instagram `from-pink-500 to-orange-400` gradient text, Facebook `#1877F2`, Twitter `#1DA1F2`, YouTube `#FF0000`.
- Ghost opacity: 35%.
- Pulse: `animation: socialPulse 3s ease-in-out infinite`.
- Tap target: 36×36 hit area (chip + invisible padding).

## Acceptance
- Avatar on profile page, barber public profile, and barber profile header shows 4 icons evenly around it (N/E/S/W).
- Instagram lit up brand-pink for the test account (has `instagram_handle`); the other three are faint ghosts.
- M4M handshake badge still beats inside the avatar — orbit doesn't cover it.
- No second row of social icons remains anywhere on the profile.
- Mobile (390px) layout has no horizontal overflow.

## Technical notes
- Pure CSS positioning with inline `style={{ transform: ... }}` per icon — no extra libs.
- New keyframe `social-pulse` added to `src/index.css`.
- Uses existing `lucide-react` icons (`Instagram`, `Facebook`, `Twitter`, `Youtube`).
- All colors via semantic tokens or brand-specific HSL values defined in `index.css`.
