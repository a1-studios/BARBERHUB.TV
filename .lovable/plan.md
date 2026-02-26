

## Fix BookingConsole Layout & Balance Display

### Issues Identified

1. **Balance confusion**: "Your Balance: 25 BB" is displayed directly under the barber's name "style_master", making it look like the barber's balance. The 25 BB is actually the **logged-in client's** balance — correct data, but misleading placement.

2. **Layout overflow**: The dialog is too narrow on mobile — the tri-state toggle buttons are clipped (Emergency/House Call text truncated), and content overflows horizontally.

### Changes

#### File: `src/components/booking/BookingConsole.tsx`

**Fix 1 — Separate balance from barber info**:
- Move the balance display out of the barber header section into its own row below the barber info
- Label it clearly: "Your Wallet" with a wallet icon, visually distinct from the barber's identity
- Add the logged-in user's name or just keep "Your Balance" in a separate bordered pill/badge so it's obviously about the client, not the barber

**Fix 2 — Dialog width & responsive layout**:
- Change `sm:max-w-lg` to `sm:max-w-md w-[95vw]` so the dialog takes nearly full width on mobile
- Make tri-state toggle buttons use shorter labels on small screens: "Standard" / "SOS" / "House" instead of "Emergency" / "House Call"
- Reduce button padding and text size slightly for the toggle row

**Fix 3 — Button label cleanup**:
- Rename "Emergency" to "SOS" (shorter, fits better)
- Rename "House Call" to "House" on the toggle (the mode content already explains the full name)

### Summary of visual changes

| Element | Before | After |
|---------|--------|-------|
| Balance | Under barber name, looks like barber's balance | Separate row below header with wallet icon, clearly labeled as client's wallet |
| Dialog width | `sm:max-w-lg`, clips on mobile | `w-[95vw] sm:max-w-md`, full mobile width |
| Toggle labels | "Standard" / "Emergency" / "House Call" (truncated) | "Standard" / "SOS" / "House Call" (fits) |

