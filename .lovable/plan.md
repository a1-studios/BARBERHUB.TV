

# Unify Barber Portfolio, Visible Delete, and BARBER-HUB Watermark

## Problem Summary

1. **Settings Portfolio tab is disconnected** — `PortfolioManager` uses local `useState` for images and never reads the `creations` table. So uploads done on the public profile don't appear in Settings, and vice versa.
2. **Delete button invisible on mobile** — Uses `opacity-0 group-hover:opacity-100`, which doesn't work on touch devices.
3. **Watermark needs redesign** — Currently tiny "BARBER HUB" top-left at 10px. Needs centered, transparent, tactical "BARBER-HUB" with "-HUB" in signature orange.

---

## Plan

### 1. Rewrite PortfolioManager to use the `creations` table
**File: `src/components/profiles/PortfolioManager.tsx`**

- Replace local `useState<PortfolioImage[]>` with a `useQuery` that fetches from `creations` table (same query as `BarberPublicProfile`):  
  `supabase.from('creations').select('*').eq('barber_id', barberId).order('created_at', { ascending: false })`
- Accept both images AND videos (change `accept="image/*"` → `accept="image/*,video/*"`)
- On upload, use `uploadPortfolioMedia` (R2) then insert into `creations` table (matching BarberPublicProfile's handler)
- On delete, call `supabase.from('creations').delete().eq('id', id)` and invalidate the query
- Apply the same 5GB cumulative cap logic
- Show videos inline with a `<video>` tag (like BarberPublicProfile does)

### 2. Make delete button always visible for owners
**File: `src/pages/BarberPublicProfile.tsx`** (lines 559-567)

Change `opacity-0 group-hover:opacity-100` → always visible on mobile:
```
className="absolute top-2 left-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-8 w-8"
```

Same pattern applied in the rewritten `PortfolioManager`.

### 3. Centered BARBER-HUB watermark
**File: `src/components/BrandedVideoPlayer.tsx`** (lines 121-127)

Replace the top-left 10px watermark with a centered, transparent tactical watermark:
- Position: `absolute inset-0 flex items-center justify-center` (dead center of video)
- Text: `BARBER` in white/15 opacity, `-HUB` in primary (orange) /20 opacity
- Size: `text-2xl font-black tracking-[0.3em]`
- Style: `pointer-events-none select-none` so it doesn't interfere with controls

**File: `src/pages/WatchFeed.tsx`**

Add the same centered watermark overlay to each feed video item (the WatchFeed doesn't use `BrandedVideoPlayer`).

---

## Files to modify

| File | Changes |
|------|---------|
| `src/components/profiles/PortfolioManager.tsx` | Full rewrite — query `creations` table, support images+videos, delete from DB, R2 upload |
| `src/pages/BarberPublicProfile.tsx` | Make delete button always visible on mobile (1 line) |
| `src/components/BrandedVideoPlayer.tsx` | Replace top-left watermark with centered transparent "BARBER-HUB" |
| `src/pages/WatchFeed.tsx` | Add same centered watermark overlay to feed videos |

