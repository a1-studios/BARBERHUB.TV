

# Fix Add Funds Stripe Checkout Redirect

## Problem Summary

When clicking "Add Funds", the user sees an "about:blank" tab instead of being redirected to Stripe Checkout. The network request shows the `purchase-barber-bucks` edge function successfully returns a Stripe checkout URL (Status 200), but the redirect fails.

## Root Cause

The current popup strategy in `useBarberBucks.tsx` has a race condition:

```tsx
// Current problematic flow:
const popup = window.open("about:blank", "_blank"); // Opens blank tab immediately
const { data } = await supabase.functions.invoke(...); // Async API call
popup.location.href = data.url; // By now, popup reference may be stale
```

In Lovable's preview iframe environment, the popup reference becomes invalid by the time the async call completes, leaving the user stuck on "about:blank".

## Solution

Replace the pre-opened popup approach with a more reliable redirect strategy:

1. **Show loading state** when the purchase button is clicked
2. **Close the modal** after receiving the Stripe URL
3. **Navigate directly** using `window.open()` with the actual URL (not about:blank)
4. **Fallback gracefully** if popup is blocked

## Technical Changes

### File: `src/hooks/useBarberBucks.tsx`

**Current Code (lines 87-126):**
```tsx
const purchaseBucks = useMutation({
  mutationFn: async (packageAmount: number) => {
    // ...pre-opens about:blank, then tries to update URL
  }
});
```

**Updated Code:**
```tsx
const purchaseBucks = useMutation({
  mutationFn: async (packageAmount: number) => {
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke('purchase-barber-bucks', {
      body: { package_amount: packageAmount }
    });

    if (error) throw error;
    if (!data?.url) throw new Error("No checkout URL returned");

    return data;
  },
  onSuccess: (data) => {
    toast.message("Redirecting to Stripe checkout...");
    
    // Try opening in new tab with actual URL
    const popup = window.open(data.url, "_blank", "noopener,noreferrer");
    
    if (!popup || popup.closed) {
      // If popup blocked, redirect current window
      window.location.href = data.url;
    }
  },
  onError: (error: any) => {
    toast.error(error.message || "Failed to initiate purchase");
    console.error("Purchase bucks error:", error);
  }
});
```

**Key Improvements:**
- Opens popup **after** receiving the valid Stripe URL (not before)
- Uses `window.open(data.url, "_blank")` directly instead of `about:blank` + later assignment
- Has clean fallback to same-window redirect if popup is blocked
- Separates async logic from navigation for cleaner flow

### File: `src/components/AddFundsModal.tsx`

Add loading feedback and close modal on success:

```tsx
const handleAddFunds = async (usdAmount: number) => {
  purchaseBucks.mutate(usdAmount, {
    onSuccess: () => {
      onClose(); // Close modal when redirecting to Stripe
    }
  });
};
```

## Summary of Changes

| File | Changes |
|------|---------|
| `src/hooks/useBarberBucks.tsx` | Remove pre-opened about:blank popup; open popup with actual URL after API call; move navigation to onSuccess handler |
| `src/components/AddFundsModal.tsx` | Close modal on successful checkout initiation |

## Expected Result

1. User clicks a package (e.g., $25 = 130 BB)
2. API call to `purchase-barber-bucks` executes
3. Modal closes and toast shows "Redirecting to Stripe checkout..."
4. New tab opens directly to Stripe Checkout (not about:blank)
5. User completes payment on Stripe
6. User returns to app with updated BB balance

