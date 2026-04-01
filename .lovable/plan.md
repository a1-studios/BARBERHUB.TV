

# Move Notification Bell into BB Dropdown Widget

## What Changes

1. **Remove bell from header bar** — delete the standalone `<NotificationPanel />` from the header's right side
2. **Add bell inside BB dropdown** — place a Notifications row (with bell icon + unread badge) inside the BB balance dropdown widget, between the balance header and "Add Funds"
3. **Keep unread count on the profile coin** — overlay the unread notification count badge on the `RotatingBBCoin` component so users see the count without opening anything

## File Changes

### `src/components/Header.tsx`
- Remove `{user && <NotificationPanel />}` from line 225
- Keep `NotificationPanel` import — it will be used inside the dropdown
- Add a "Notifications" button row inside the BB dropdown (lines 249-269) that opens the notification panel inline or navigates
- Add unread count badge overlay on the `RotatingBBCoin` wrapper div using `useNotifications` hook

### `src/components/NotificationPanel.tsx`
- No structural changes needed — the component already works as a self-contained dropdown with its own open/close state
- Will be embedded inside the BB dropdown as a nested item, or we render just the notification list inline

## Approach

The simplest clean approach: 
- The `RotatingBBCoin` gets an unread badge overlaid on it (in Header, not in the coin component itself)
- Inside the BB dropdown, add a "Notifications" button with bell icon + count that, when clicked, opens a full notification list (either inline-expanding the dropdown or replacing the dropdown content with the notification list)
- Clicking the bell row toggles between "wallet view" and "notifications view" within the same dropdown

