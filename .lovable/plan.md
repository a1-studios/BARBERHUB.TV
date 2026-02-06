

# Restore Profile Picture on Coin Back Face

## What Changes

Revert the coin's back face to display the user's profile avatar (or initials fallback), and move the balance display exclusively into the dropdown menu. The coin becomes a personalized avatar coin again -- BB logo on front, your face on back.

## Changes

### 1. Header -- Pass avatar props instead of balanceText

**File: `src/components/Header.tsx`**

- Remove `balanceText` prop from the `RotatingBBCoin` instance (line 267)
- Add `avatarUrl={userProfile?.avatar_url}` and `displayName={userProfile?.display_name}` props instead
- The dropdown menu already shows the balance, so no changes needed there

### 2. RotatingBBCoin -- Remove the balanceText conditional (cleanup)

**File: `src/components/economy/RotatingBBCoin.tsx`**

- Remove `balanceText` from the props interface
- Remove the `balanceText` conditional block (lines 71-108) from the back face rendering
- The back face will always render the avatar/initials path, which is the original behavior
- Front face (BB logo) and engraving overlay remain untouched

## Visual Result

**Header coin:** BB logo on front, user profile picture (or gold initial) on back -- rotating continuously

**Dropdown (on click):** Shows "Your Balance: X BB" with Add Funds and Transaction History buttons -- unchanged from current

## Files Modified

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Replace `balanceText` prop with `avatarUrl` and `displayName` props |
| `src/components/economy/RotatingBBCoin.tsx` | Remove `balanceText` prop and its conditional rendering block |

