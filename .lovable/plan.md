
# Replace Prize Counter with Social Login Icons + Role Selection Flow

## What Changes

The `WorldCupPrizeCounter` component at the top of the landing hero (lines 229-231 in `LandingHero.tsx`) gets replaced with three social login buttons: Google, Apple, and Instagram. After a user taps a social button, a role selection modal appears asking "Are you a Barber or a Fan?" before completing auth. The existing email sign-in/sign-up card below remains untouched as a fallback.

## Flow

1. User taps Google / Apple / Instagram icon on landing
2. A lightweight role-picker modal appears (Barber or Fan — same two cards already in `UserTypeSelector`)
3. User picks role → stored in `localStorage` as `pending_social_role`
4. OAuth redirect fires via `supabase.auth.signInWithOAuth()`
5. On return, `useAuth` detects new user (no profile yet) → reads `pending_social_role` from localStorage → creates profile + user_role row via a new edge function or the existing `handle_new_user` trigger
6. If barber, redirect to Arena Gate for onboarding; if fan, land on home

## Important Caveats

- **Google**: Supabase supports natively — must be configured in Supabase dashboard (Auth → Providers → Google). User needs to set up Google Cloud OAuth credentials.
- **Apple**: Supabase supports natively — requires Apple Developer account + Sign in with Apple service ID configured in Supabase dashboard.
- **Instagram**: Supabase does **not** support Instagram as an OAuth provider. Options: (a) use Facebook/Meta OAuth (Instagram's parent), or (b) show Instagram as a "coming soon" button. Will implement Facebook OAuth as the underlying provider with Instagram branding, since Instagram accounts are Meta accounts.

## File Changes

### `src/components/LandingHero.tsx`
- **Lines 229-231**: Replace `<WorldCupPrizeCounter />` with a row of three social login icon buttons (Google, Apple, Instagram/Meta)
- Add state `showRolePicker` and `pendingProvider` to track which OAuth provider the user selected
- Add a `RolePickerModal` inline component — minimal dialog with the Barber/Fan cards
- On role selection: store role in `localStorage('pending_social_role')`, then call `supabase.auth.signInWithOAuth({ provider })` with redirect

### `src/hooks/useAuth.tsx`
- In `onAuthStateChange`, when a new user signs in via OAuth (no existing profile role), read `pending_social_role` from localStorage
- Call a Supabase RPC or update to assign the role to `user_roles` and `profiles` tables
- The existing `handle_new_user` trigger already reads `raw_user_meta_data.user_type`, but OAuth users won't have this set — so we need a post-auth role assignment step

### New: Post-OAuth role assignment
- After OAuth callback, if `pending_social_role` exists in localStorage:
  - Update `profiles.user_type` to the selected role
  - Insert into `user_roles` table
  - Create `barber_profiles` or `client_profiles` row accordingly
  - Clear localStorage
- This can be done via a new database function `assign_social_auth_role(p_user_id, p_role)` called from the client after auth

### Database Migration
- New RPC function `assign_social_auth_role(p_user_id UUID, p_role TEXT)` that:
  - Updates `profiles.user_type`
  - Inserts into `user_roles`
  - Creates the specialized profile (barber_profiles or client_profiles)
  - Only runs if user doesn't already have a role assigned

## Prerequisites (User Action Required)

The user must configure OAuth providers in their Supabase dashboard:
1. **Google**: Auth → Providers → Google → add Client ID + Secret from Google Cloud Console
2. **Apple**: Auth → Providers → Apple → add Service ID + Secret Key from Apple Developer
3. **Facebook** (for Instagram): Auth → Providers → Facebook → add App ID + Secret from Meta Developer Console

## Visual Design

Three circular icon buttons centered horizontally, styled with the brand colors:
- Google: white bg with Google "G" logo
- Apple: black bg with Apple icon
- Instagram: gradient bg (pink/purple/orange) with Instagram icon
- Subtitle text: "Sign in with" above the icons
