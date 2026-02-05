
# BB Wallet Coin Redesign: Rotating Coin with Profile Avatar

## Overview

Create an immersive 3D-style rotating coin component that serves as the Barber Bucks (BB) wallet display throughout the app. The coin:
- **Front**: Shows the new BB logo (uploaded image)
- **Back**: Shows the user's profile avatar
- Continuously rotates with a smooth CSS/Framer Motion animation
- All users see their wallet on their profile
- Only barbers have a "Withdraw" option to convert BB to real money

---

## Visual Design

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ROTATING BB COIN                             │
│                                                                  │
│  ┌────────────┐     flip     ┌────────────┐                     │
│  │  ┌──────┐  │    ←────→    │  ┌──────┐  │                     │
│  │  │  BB  │  │              │  │ 👤   │  │                     │
│  │  │ LOGO │  │              │  │AVATAR│  │                     │
│  │  └──────┘  │              │  └──────┘  │                     │
│  │  FRONT     │              │   BACK     │                     │
│  └────────────┘              └────────────┘                     │
│                                                                  │
│  Animation: Y-axis rotation (0° → 360°) every 6 seconds          │
│  Perspective: 1000px for 3D depth effect                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### New Components

| Component | Purpose |
|-----------|---------|
| `src/components/economy/RotatingBBCoin.tsx` | The 3D rotating coin component with BB logo front and avatar back |
| `src/components/economy/BBWalletWidget.tsx` | Compact wallet widget for profile pages (coin + balance + actions) |

### Modified Components

| Component | Changes |
|-----------|---------|
| `src/pages/Profile.tsx` | Add BBWalletWidget for fans (barbers already have wallet via BarberProfileHeader) |
| `src/components/barber/BarberProfileHeader.tsx` | Replace static Coins icon with RotatingBBCoin |
| `src/components/economy/BBWalletCard.tsx` | Update to use RotatingBBCoin instead of Wallet icon |
| `src/components/AddFundsModal.tsx` | Replace Zap icon header with RotatingBBCoin |

---

## Technical Implementation

### 1. RotatingBBCoin Component

```tsx
interface RotatingBBCoinProps {
  avatarUrl?: string | null;
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';  // 24px, 32px, 48px, 64px
  animate?: boolean;                  // Toggle rotation animation
  onClick?: () => void;
}
```

Key Features:
- Uses CSS `transform-style: preserve-3d` for true 3D flip effect
- Front face: BB logo image (imported from assets)
- Back face: User's avatar with fallback initial
- Framer Motion for smooth continuous Y-axis rotation
- Orange metallic border matching the coin design
- Configurable sizes for different contexts

### 2. BBWalletWidget Component

```tsx
interface BBWalletWidgetProps {
  isBarber: boolean;
  barberBucks: number;
  avatarUrl?: string | null;
  displayName?: string;
  onAddFunds: () => void;
  onWithdraw?: () => void;  // Only for barbers
}
```

Features:
- Centered rotating coin as the visual focus
- Balance display below coin
- "Add Funds" button for all users
- "Withdraw" button only visible for barbers
- Compact card design for profile integration

### 3. Withdraw Feature (Barbers Only)

- New button in BBWalletWidget visible only when `isBarber === true`
- Opens a modal to request BB → USD conversion
- Placeholder for now - actual Stripe payout integration can be Phase 2
- Show toast: "Withdrawal requests are processed within 3-5 business days"

---

## File Changes Summary

### New Files

| File | Description |
|------|-------------|
| `src/assets/bb-coin-logo.png` | Copy uploaded BB coin image to assets |
| `src/components/economy/RotatingBBCoin.tsx` | 3D rotating coin component |
| `src/components/economy/BBWalletWidget.tsx` | Profile wallet widget with coin |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/Profile.tsx` | Add BBWalletWidget card for fans in personal info section |
| `src/components/barber/BarberProfileHeader.tsx` | Replace Coins icon with RotatingBBCoin in BB display |
| `src/components/economy/BBWalletCard.tsx` | Use RotatingBBCoin instead of Wallet icon |
| `src/components/AddFundsModal.tsx` | Use RotatingBBCoin in header instead of Zap icon |

---

## CSS Animation Details

```css
/* 3D Coin Container */
.coin-container {
  perspective: 1000px;
}

.coin {
  transform-style: preserve-3d;
  animation: rotate-coin 6s linear infinite;
}

@keyframes rotate-coin {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}

.coin-front, .coin-back {
  backface-visibility: hidden;
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.coin-back {
  transform: rotateY(180deg);
}
```

Using Framer Motion for React integration:
```tsx
<motion.div
  animate={{ rotateY: 360 }}
  transition={{
    duration: 6,
    repeat: Infinity,
    ease: "linear"
  }}
  style={{ transformStyle: "preserve-3d" }}
>
  {/* Front & Back faces */}
</motion.div>
```

---

## Profile Wallet Placement

### Fan Users

```text
┌─────────────────────────────────────────────────────────────────┐
│ Profile Page - Fan                                               │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Personal Information Card                                   │ │
│ │ ...existing fields...                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ BB Wallet Card (NEW)                                        │ │
│ │                                                             │ │
│ │      ┌─────────┐                                            │ │
│ │      │ 🪙      │  ← Rotating coin                           │ │
│ │      │ BB/👤   │                                            │ │
│ │      └─────────┘                                            │ │
│ │                                                             │ │
│ │      1,250 BB                                               │ │
│ │                                                             │ │
│ │   [Add Funds]                                               │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Barber Users

Already have wallet display in BarberProfileHeader - will be enhanced with rotating coin instead of static Coins icon. Additionally, barbers get a "Withdraw" button.

---

## Coin Size Reference

| Size | Pixels | Use Case |
|------|--------|----------|
| `xs` | 24px | Inline text, headers, compact displays |
| `sm` | 32px | Buttons, list items |
| `md` | 48px | Cards, modal headers |
| `lg` | 64px | Profile wallet focal point |

---

## Implementation Order

1. Copy BB coin logo image to `src/assets/bb-coin-logo.png`
2. Create `RotatingBBCoin.tsx` component with 3D CSS animation
3. Create `BBWalletWidget.tsx` for profile integration
4. Update `Profile.tsx` to show wallet for fans
5. Update `BarberProfileHeader.tsx` to use rotating coin + add Withdraw button for barbers
6. Update `BBWalletCard.tsx` to use rotating coin
7. Update `AddFundsModal.tsx` header to use rotating coin

---

## Future Considerations

- **Phase 2**: Actual Stripe Connect payout integration for barber withdrawals
- The coin animation can be paused on hover to show details
- Consider adding particle effects or glow on balance changes
