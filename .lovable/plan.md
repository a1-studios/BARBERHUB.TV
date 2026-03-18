

## Fix: Hide Membership Plans from Fans + Update Pill Colors

### Problem
1. **Fans can see the "Membership Plans" drawer** when visiting a barber's public profile. The `AvatarCrest` has `interactive={!isOwner}`, meaning it opens for visitors (including fans) but not for the profile owner — the exact opposite of what's needed.
2. **Feature pill text** in `BarberSubscriptionTiers` uses default foreground color instead of cyan blue and white.

### Changes

#### 1. Fix `interactive` prop on `AvatarCrest` in `BarberPublicProfile.tsx` (line 292)
Change from `interactive={!isOwner}` to `interactive={isOwner}`. This way only the barber who owns the profile sees the upgrade drawer when tapping their avatar. Fans and other visitors just see the static crest.

#### 2. Update feature pill colors in `BarberSubscriptionTiers.tsx` (line ~185-189)
Change the feature list text from default `text-sm` to `text-sm text-cyan-400` for the feature text, and keep the check icon as white (`text-white`) instead of `text-primary`.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/BarberPublicProfile.tsx` | Flip `interactive` prop: `interactive={isOwner}` |
| `src/components/barber/BarberSubscriptionTiers.tsx` | Feature text → `text-cyan-400`, check icon → `text-white` |

