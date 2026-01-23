
# Fix AddFundsModal Portal Crash

## Problem
The site crashes when clicking "Add Funds" because `createPortal(content, document.body)` is called when `document.body` may not yet be available. This is a common issue with React portals that access the DOM directly.

## Solution
Add a client-side mount check to ensure `document.body` exists before rendering the portal. This involves:

1. Using a `useState` + `useEffect` pattern to track when the component has mounted
2. Only rendering the portal after confirming we're on the client side with a valid `document.body`

## Technical Changes

### File: `src/components/AddFundsModal.tsx`

**Add mounted state check:**
```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
  return () => setMounted(false);
}, []);
```

**Update the return statement:**
```tsx
// Early return if not open OR not mounted yet
if (!isOpen || !mounted) return null;

return createPortal(
  // ... modal content
  document.body
);
```

This ensures the portal only renders after:
1. The component has mounted on the client
2. The modal is explicitly opened
3. `document.body` is guaranteed to exist

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/AddFundsModal.tsx` | Add `mounted` state with `useEffect` to ensure client-side rendering before accessing `document.body` |

## Expected Result
- Clicking "Add Funds" opens the modal without crashing
- Modal remains perfectly centered on screen
- Header stays visible and crisp (not blurred)
- Stripe payment flow works when selecting a package
