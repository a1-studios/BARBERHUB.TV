

## Fix: M4M Heart — Place Under Avatar, Enlarge, Keep Profile Untouched

Two changes only:

### 1. `src/components/m4m/M4MHeartbeat.tsx`
- Change `md` size from `w-8 h-8` to `w-16 h-16 md:w-24 md:h-24` (80% of avatar)
- Change `sm` size from `w-6 h-6` to `w-10 h-10`

### 2. `src/components/barber/BarberProfileHeader.tsx` (lines 112-126)
- Wrap Avatar + M4MHeartbeat in a `flex flex-col items-center` container
- Move M4MHeartbeat from its current inline position to directly beneath the Avatar inside the wrapper

```
<div className="flex flex-col items-center gap-1">
  <Avatar ... />
  <M4MHeartbeat ... size="md" />
</div>
```

No other profile layout changes. The heart sits in the empty space below the picture. Clicking it opens the existing M4M verification modal on a separate dialog — no profile content is altered.

