

## Personalized Welcome + Ghost Tier Rings

### Two features to implement:

---

### 1. Personalized Welcome Experience

**Problem**: Current `WelcomeModal` is generic -- says "Welcome to BarberHub!" without using the user's name.

**Solution**: 

**`WelcomeModal.tsx`** (modify):
- Fetch user's `display_name` from profile (via `useUserProfile` hook already available)
- **New users (first login)**: Fun, celebratory welcome: "Welcome to the Arena, **{Name}**! 🔥" with country flag if available. For barbers, add something like "Time to show the world what you've got." For fans, "The front row awaits."
- **Returning users**: Check `localStorage` for `barberhub_welcome_seen`. If it exists and user lands on Index, show a brief toast instead: `Welcome back, {Name}! 🔥` -- no modal, just a `sonner` toast on mount.

**`Index.tsx`** (modify):
- Add a "welcome back" toast for returning authenticated users (once per session via `sessionStorage`). Fetch display_name from user metadata (`user.user_metadata.display_name`) to avoid extra query.

**Flow**:
- First-ever login → Full `WelcomeModal` with personalized name + role-specific messaging
- Subsequent logins → Quick toast: "Welcome back, {Name}!" (once per session)

---

### 2. Ghost Tier Rings on All Avatars

**Problem**: Users with `free` tier see a plain border. They can't visualize what Bronze/Silver/Gold looks like, so there's no aspirational pull.

**Solution**: When `tier` is `free` (or null), render a faint "ghost" preview of the Bronze ring around the avatar -- a very dim, desaturated version of the bronze glow + 2 ghost LED dots. This shows free users what a tier ring *could* look like and makes the edge light up subtly.

**`TierRing.tsx`** (modify):
- When `tierKey === 'free'`, render a ghost ring: `border-orange-500/15` with a very subtle animation (`animate-tier-glow-ghost`). Show 2 ghost LED dots at 10% opacity.
- Add a new `showGhostPreview` prop (default `true`) so it can be disabled where unwanted.
- The ghost ring edge should have a faint pulsing glow -- visible but clearly "locked/aspirational."

**`src/index.css`** (modify):
- Add `tierGlowGhost` keyframes: very subtle pulse between `box-shadow: 0 0 4px hsl(24 100% 52% / 0.08)` and `0 0 8px hsl(24 100% 52% / 0.15)`.
- Add `.animate-tier-glow-ghost` class.

**Where it appears**: Everywhere `TierRing` is used -- `BarberProfileHeader`, `BarberProfileCard`, `BattleCard`, `FeaturedCreatorCard`, `BarberPublicProfile`. No changes needed in those files since they already pass `tier` which will be `null`/`free`.

**Fan avatars**: Update `FanProfileHeader.tsx` to also wrap the avatar in a `TierRing` with `tier="free"` so fans also see the ghost ring and understand the tier system exists.

---

### Files Changed

| File | Change |
|------|--------|
| `src/components/onboarding/WelcomeModal.tsx` | Add `useUserProfile` to get name. Personalize title: "Welcome, {Name}!" with role-specific subtitle. |
| `src/pages/Index.tsx` | Add welcome-back toast for returning users (sessionStorage-gated, once per session). Use `user.user_metadata.display_name`. |
| `src/components/TierRing.tsx` | When `free`: render ghost ring (dim bronze border + ghost LEDs at 10% opacity + subtle glow animation). Add `showGhostPreview` prop. |
| `src/components/fan/FanProfileHeader.tsx` | Wrap avatar in `TierRing` with `tier="free"` so fans see the ghost ring too. |
| `src/index.css` | Add `tierGlowGhost` keyframes and `.animate-tier-glow-ghost` class. |

