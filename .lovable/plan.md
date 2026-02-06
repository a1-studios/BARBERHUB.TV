

# Replace Header BB Icon with Rotating 3D Coin

## Overview

Replace the static "BB" text icon in the header's Barber Bucks dropdown with the new `RotatingBBCoin` component. The coin will continuously rotate, showing the BB logo on one side and the user's avatar on the other. All existing dropdown functionality (Add Funds, Transaction History) will remain intact.

---

## Current State

The header currently displays:
```text
┌─────────────────────────────────────────────────────────────────┐
│  [Barber Pole]     BARBER-HUB          [BB 1,250 ▼]            │
│                                                                  │
│                                         ↓ Dropdown               │
│                                         ┌────────────────┐       │
│                                         │ Your Balance   │       │
│                                         │ BB 1,250       │       │
│                                         │ Add Funds      │       │
│                                         │ History        │       │
│                                         └────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## New Design

```text
┌─────────────────────────────────────────────────────────────────┐
│  [Barber Pole]     BARBER-HUB      [🪙 1,250 ▼]                 │
│                                     ↑                            │
│                            Rotating 3D Coin (xs size)            │
│                            - Front: BB Logo                      │
│                            - Back: User Avatar                   │
│                                                                  │
│                                         ↓ Dropdown (unchanged)   │
│                                         ┌────────────────┐       │
│                                         │ 🪙 (md size)   │       │
│                                         │ Your Balance   │       │
│                                         │ BB 1,250       │       │
│                                         │ Add Funds      │       │
│                                         │ History        │       │
│                                         └────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Changes

### File: `src/components/Header.tsx`

**1. Add Imports**
```tsx
import { RotatingBBCoin } from './economy/RotatingBBCoin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
```

**2. Add Profile Query** (for avatar_url and display_name)
```tsx
const { data: userProfile } = useQuery({
  queryKey: ['header-profile', user?.id],
  queryFn: async () => {
    if (!user?.id) return null;
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, display_name')
      .eq('user_id', user.id)
      .single();
    return data;
  },
  enabled: !!user?.id
});
```

**3. Replace BB Button Content**

From:
```tsx
<span className="text-xs font-bold text-cyan">BB</span>
<span className="text-sm font-semibold text-primary tabular-nums">
  {barberBucks.toLocaleString()}
</span>
```

To:
```tsx
<RotatingBBCoin
  avatarUrl={userProfile?.avatar_url}
  displayName={userProfile?.display_name}
  size="xs"
  animate={true}
/>
<span className="text-sm font-semibold text-primary tabular-nums">
  {barberBucks.toLocaleString()}
</span>
```

**4. Update Dropdown Balance Header**

Add the rotating coin (medium size) to the dropdown balance display for visual consistency:

```tsx
{/* Balance Header in dropdown */}
<div className="px-3 py-3 bg-gradient-to-r from-primary/10 to-cyan/5 border-b border-border/30 flex items-center gap-3">
  <RotatingBBCoin
    avatarUrl={userProfile?.avatar_url}
    displayName={userProfile?.display_name}
    size="sm"
    animate={true}
  />
  <div>
    <p className="text-xs text-muted-foreground">Your Balance</p>
    <p className="text-lg font-bold">
      <span className="text-primary">{barberBucks.toLocaleString()}</span>
      <span className="text-cyan text-sm ml-1">BB</span>
    </p>
  </div>
</div>
```

**5. Remove Unused Icons**
- Remove `Wallet` from lucide imports (no longer needed)

---

## Summary

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Replace "BB" text with RotatingBBCoin, add profile query for avatar, update dropdown balance header with coin |

---

## Result

- The header BB balance button now features the 3D rotating coin (xs size - 28px)
- The coin shows the BB logo on one side and the user's avatar on the other
- Dropdown menu remains fully functional with Add Funds and Transaction History
- The dropdown header also shows the rotating coin for visual consistency
- All existing functionality preserved - only the visual icon changes

