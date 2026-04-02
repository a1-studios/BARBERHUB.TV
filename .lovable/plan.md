

# Fix: Don't Notify Streaming Barber About Their Own Stream

## Problem
When a barber goes live, they also receive the "🔴 LIVE NOW!" toast notification because the `useFollowedBarbersNotifications` hook doesn't exclude the current user from the followed barbers list. If the barber follows themselves (or their ID is in `creator_follows`), they get notified about their own stream.

## Solution

### File: `src/hooks/useFollowedBarbersNotifications.tsx`

One-line fix — filter out the current user's ID when building the followed barbers list:

```typescript
// Line 29: change from
const barberIds = follows.map(f => f.creator_id);

// To
const barberIds = follows.map(f => f.creator_id).filter(id => id !== user.id);
```

This ensures:
- The current user's ID is never in the `followedBarberIds` array
- The realtime subscription never listens for changes on the current user's barber profile
- The toast notification is only shown to followers, not the streamer themselves

No other files need changes.

