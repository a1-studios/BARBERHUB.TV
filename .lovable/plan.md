

## Move Delete Account to Page Bottom + Double Confirmation

### Changes

**1. Remove "Delete Account" button from both header components**
- `BarberProfileHeader.tsx`: Remove the Delete Account button from the action buttons section (line 219-224). Keep Sign Out.
- `FanProfileHeader.tsx`: Remove the Delete Account button from the action buttons section (line 227-232). Keep Sign Out.

**2. Add standalone Delete Account button at the very bottom of the Profile page**
- In `Profile.tsx`, add a bright red "Delete Account" button after `<TransactionHistory />` and before the closing `</div>` of the main content area.
- Style: full-width or centered, `bg-red-600 hover:bg-red-700 text-white`, with a `Trash2` icon. Clearly dangerous-looking.

**3. Implement double confirmation dialog**
- Replace the single `AlertDialog` with a two-step flow:
  - **Step 1**: "Are you sure you want to delete your account?" with Cancel / "Yes, Continue"
  - **Step 2**: "This is your FINAL warning. This cannot be undone." with Cancel / "Permanently Delete My Account"
- Use a `deleteStep` state (`0 | 1 | 2`) to track which confirmation the user is on.
- Only call `handleDeleteAccount` after the user confirms step 2.

### Files Changed

| File | Change |
|------|--------|
| `src/components/barber/BarberProfileHeader.tsx` | Remove Delete Account button from action buttons |
| `src/components/fan/FanProfileHeader.tsx` | Remove Delete Account button from action buttons |
| `src/pages/Profile.tsx` | Add bright red Delete Account button at page bottom. Replace single AlertDialog with two-step confirmation flow. |

