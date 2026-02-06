

# Minimize BB Coin Header Footprint

## What Changes

The BB coin area in the header currently takes up space with a gradient background box, the numeric balance text beside the coin, and a chevron arrow. This plan strips all surrounding elements so only the bare rotating coin sits in the header. The balance amount moves onto the back face of the coin itself, replacing the user avatar/initials -- a clever space-saver that keeps the information accessible at a glance every rotation.

## Changes

### 1. RotatingBBCoin -- Add balance display on the back face

**File: `src/components/economy/RotatingBBCoin.tsx`**

- Add a new optional prop: `balanceText?: string` (e.g., `"1,250"`)
- When `balanceText` is provided, the **back face** renders the balance amount instead of the avatar/initials:
  - Dark gradient background (same engraved style)
  - Balance number in gold (#F5C518), sized proportionally to the coin
  - Small "BB" label underneath in a dimmer gold
  - The engraving overlay stays for visual consistency
- When `balanceText` is **not** provided, the back face behaves exactly as it does now (avatar or initial fallback) -- so no regression for other uses of the coin (BarberProfileHeader, AddFundsModal, etc.)

### 2. Header -- Strip the BB button down to just the coin

**File: `src/components/Header.tsx`**

**Trigger button** (lines 266-290) simplified from:
```text
[gradient box] [coin] [1,250] [chevron] [/gradient box]
```
To just:
```text
[coin]
```

Specific removals from the trigger button:
- Remove the wrapping gradient background, border, padding, and glow styles
- Remove the `barberBucks.toLocaleString()` text span
- Remove the `ChevronDown` icon
- Pass the new `balanceText={barberBucks.toLocaleString()}` prop to the coin so the balance shows on the back face
- Keep the `onClick` to toggle the dropdown
- Keep the `ref` wrapper for outside-click detection

**Dropdown menu** (lines 293-338) -- streamline the header section:
- Remove the duplicate `RotatingBBCoin` from the dropdown balance header
- Simplify the balance header to just show "Your Balance: X BB" as a compact text row (no second coin)
- Keep "Add Funds" and "Transaction History" action buttons exactly as they are
- Ensure solid `bg-card` background (not transparent) with proper `z-50`

### 3. Remove unused import

- The `ChevronDown` import from lucide-react can be removed from Header.tsx since it's no longer used

## Visual Result

**Before (header right side):**
```text
[ gradient-box | [coin] 1,250 v ]
```

**After (header right side):**
```text
[coin]
```

The coin rotates showing BB logo on front, and "1,250 BB" engraved in gold on the back. Clicking it opens the dropdown with balance details and actions. Same functionality, dramatically less space.

## Files Modified

| File | Change |
|------|--------|
| `src/components/economy/RotatingBBCoin.tsx` | Add optional `balanceText` prop; render balance on back face when provided |
| `src/components/Header.tsx` | Strip BB button to bare coin only; pass `balanceText` prop; simplify dropdown header; remove `ChevronDown` import |

## What Stays the Same

- All dropdown functionality (Add Funds, Transaction History)
- AddFundsModal integration
- Outside-click and Escape key dismissal
- The coin's front face (BB logo) is unchanged
- Other components using RotatingBBCoin (BarberProfileHeader, AddFundsModal dropdown header) are unaffected since `balanceText` is optional

