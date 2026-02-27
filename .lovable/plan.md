

## Move Sign Out to Profile Page

### Changes

#### 1. `src/pages/Profile.tsx`
- Import `useAuth` (already imported), destructure `signOut`
- Import `LogOut` icon from lucide-react
- Import `Separator` from UI components
- After `<TransactionHistory />` (line 202), add:
  - A `<Separator />` 
  - A "Sign Out" button (outline variant, full width, with LogOut icon)
  - On click: calls `signOut()` then `navigate('/')`

#### 2. `src/components/Header.tsx`
- Remove the `sign-out` entry (lines 99-106) from the `quickActions` array
- Remove the `handleSignOut` function (lines 109-112) and `LogOut` icon import if unused elsewhere

