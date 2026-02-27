

## Add Delete Account Button with Confirmation Dialog

### Changes

#### 1. New edge function: `supabase/functions/delete-account/index.ts`
- Authenticates user from JWT
- Uses service role client to call `supabase.auth.admin.deleteUser(userId)` (ON DELETE CASCADE handles profile/related data)
- Returns success/error with CORS headers

#### 2. `supabase/config.toml`
- Add `[functions.delete-account]` with `verify_jwt = false` (manual JWT validation in code)

#### 3. `src/components/barber/BarberProfileHeader.tsx`
- Add `onDeleteAccountClick` prop
- Add a "Delete Account" button (destructive ghost variant, `Trash2` icon) next to the Sign Out button

#### 4. `src/components/fan/FanProfileHeader.tsx`
- Add `onDeleteAccountClick` prop
- Add a "Delete Account" button next to the Sign Out button

#### 5. `src/pages/Profile.tsx`
- Import `AlertDialog` components and `Trash2` icon
- Add state `showDeleteConfirm`
- Add `handleDeleteAccount` function: invokes `delete-account` edge function, then signs out and navigates to `/`
- Add an `AlertDialog` with warning text ("This action is permanent and cannot be undone. All your data, battles, votes, and credits will be permanently deleted.")
- Pass `onDeleteAccountClick={() => setShowDeleteConfirm(true)}` to both header components

