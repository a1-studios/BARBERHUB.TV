

## Move Profile Button to BB Dropdown and Add Transaction History to Profile Page

### What This Does
1. Replaces the "Transaction History" button in the header's BB coin dropdown with a "Profile" button that navigates to `/profile`
2. Removes the "Profile" entry from the Quick Actions menu (barber pole icon) since it now lives in the BB dropdown
3. Adds a Transaction History section to the Profile page itself, so users can view their transactions without leaving their profile

### Changes

#### 1. Header BB Dropdown (`src/components/Header.tsx`)

**Replace** the "Transaction History" button with a "Profile" button:
- Keep "Add Funds" as the first action
- Replace "Transaction History" with a "Profile" button that navigates to `/profile`
- Use the `User` icon (already imported) instead of the `History` icon

**Remove** the "Profile" entry from the `quickActions` array (lines 91-96) since it's now accessible from the BB dropdown. The `History` icon import can also be removed.

#### 2. Profile Page (`src/pages/Profile.tsx`)

**Add** the `TransactionHistory` component below the BB Wallet Widget for fans, and below the barber profile header for barbers. This gives all users easy access to their transaction history directly on their profile page.

- Import `TransactionHistory` from `@/components/analytics/TransactionHistory`
- Render it after the existing wallet/profile sections for both fan and barber views

### Files Modified

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Replace "Transaction History" with "Profile" in BB dropdown; remove Profile from Quick Actions |
| `src/pages/Profile.tsx` | Add TransactionHistory component to the profile page |

