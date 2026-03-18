

## Fix: Prize Pool Should Show 25,000 BB Per Category (125,000 BB Total)

### Problem
The current calculation applies the 25% platform fee to the **entire** pool including the base amount. This reduces the base $5,000/category to $3,750, which displays as 18,750 BB per category (93,750 BB total across 5 categories).

The correct behavior: each category starts at **25,000 BB** (= $5,000). The 25% platform fee should only apply to dynamic contributions (entries + donations), not the guaranteed base prize.

### Current formula
```
displayPool = (BASE + donations + entries) × 0.75
= ($5,000 + $0 + $0) × 0.75 = $3,750/cat = 18,750 BB/cat
Total: 93,750 BB ← wrong
```

### Corrected formula
```
displayPool = BASE + (donations + entries) × 0.75
= $5,000 + ($0 + $0) × 0.75 = $5,000/cat = 25,000 BB/cat
Total: 125,000 BB ← correct
```

### Change

**File**: `src/hooks/useCategoryPrizePools.tsx` (line 48-49)

Change the display pool calculation so the platform fee is only deducted from dynamic contributions (entries + donations), not from the base:

```ts
// Before
const totalBeforeFee = BASE_PRIZE_POOL_CENTS + donations + entries;
const displayPool = Math.floor(totalBeforeFee * (1 - PLATFORM_FEE_PERCENT));

// After
const dynamicContributions = donations + entries;
const displayPool = BASE_PRIZE_POOL_CENTS + Math.floor(dynamicContributions * (1 - PLATFORM_FEE_PERCENT));
```

Also update the platform fee calculation on line 58 to only reflect fees on dynamic contributions:
```ts
platform_fees_collected_cents: Math.floor(dynamicContributions * PLATFORM_FEE_PERCENT),
```

One file, two lines changed. Result: 25,000 BB per category, 125,000 BB total at baseline.

