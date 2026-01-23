
# Fix White Screen After Barber Bucks Purchase

## Problem Identified

After successfully completing a Stripe checkout for Barber Bucks, users see a white/blank page. The root cause:

1. The success redirect URL includes `?session_id=...&type=bb`
2. The `PaymentSuccess.tsx` page calls `verify-tournament-payment` for **all** payments
3. That edge function expects tournament-specific metadata (`barber_profile_id`, `category`, etc.)
4. For BB purchases, this metadata doesn't exist, causing the function to fail with "Missing required metadata"
5. The error triggers a destructive toast and the page renders incorrectly

## Solution

Update `PaymentSuccess.tsx` to handle both payment types:

1. **Detect payment type** from the `type` query parameter
2. **For BB purchases (`type=bb`)**: Skip tournament verification (webhook already credited the account) and show BB-specific success message
3. **For tournament payments**: Continue with existing `verify-tournament-payment` flow

## Technical Changes

### File: `src/pages/PaymentSuccess.tsx`

**Add type detection:**
```tsx
const paymentType = searchParams.get('type'); // 'bb' for Barber Bucks, null for tournament
```

**Conditional verification logic:**
```tsx
useEffect(() => {
  const verifyPayment = async () => {
    if (!sessionId) return;
    
    // BB purchases are handled by webhook - no verification needed
    if (paymentType === 'bb') {
      toast({
        title: "Barber Bucks Added!",
        description: "Your balance has been updated. It may take a moment to reflect.",
      });
      return;
    }
    
    // Tournament verification (existing logic)
    try {
      const { data, error } = await supabase.functions.invoke("verify-tournament-payment", {
        body: { session_id: sessionId }
      });
      // ... existing error handling
    } catch (err) {
      // ... existing catch
    }
  };
  
  verifyPayment();
}, [sessionId, paymentType, toast]);
```

**Conditional UI rendering:**
```tsx
// Different content based on payment type
{paymentType === 'bb' ? (
  <BBSuccessContent />  // Show BB-specific success message
) : (
  <TournamentSuccessContent />  // Existing tournament success content
)}
```

### BB Success Content
- Title: "Barber Bucks Added!"
- Description: "Your purchase is complete"
- Icon: Coins/wallet icon instead of Trophy
- Next steps: "Check your balance in the header" and links to spend BB
- Buttons: "View Balance" → `/profile`, "Explore" → `/creator-hub`

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PaymentSuccess.tsx` | Add payment type detection, conditional verification, and separate UI for BB purchases |

## Expected Result

1. User completes BB purchase on Stripe
2. Redirect to `/payment-success?session_id=...&type=bb`
3. Page detects `type=bb` and skips tournament verification
4. Shows friendly "Barber Bucks Added!" success page
5. User can navigate back to app with updated balance (credited by webhook)
