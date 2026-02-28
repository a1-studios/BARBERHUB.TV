

## Fix: M4M Heart Always Visible on Barber Profiles

### Root Causes
1. **`M4MHeartbeat.tsx`** returns `null` when `certified` is false — should show a ghost grey outline instead
2. **`Profile.tsx`** (line 172-197) never passes `m4m_certified`, `m4m_paid`, `m4m_lives_touched`, or `barber_user_id` props to `BarberProfileHeader`

### Changes

#### 1. `src/components/m4m/M4MHeartbeat.tsx`
- Remove the `if (!certified) return null` block
- Change State A to render a very faint ghost outline (`opacity-[0.15] text-gray-500`) instead of hiding
- State B (certified, not paid): static grey outline at 50% opacity (existing)
- State C (certified + paid): beating Zion Blue pulse (existing)

#### 2. `src/pages/Profile.tsx` (lines 172-197)
- Add these props to the `BarberProfileHeader` call:
```
m4m_certified={(barberProfile as any).m4m_certified || false}
m4m_paid={(barberProfile as any).m4m_paid || false}
m4m_lives_touched={(barberProfile as any).m4m_lives_touched || 0}
barber_user_id={user?.id}
```

