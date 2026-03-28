

# Fix Watermark Size, Delete Button, and Hero Video Navigation

## Three Issues

### 1. Watermark is way too big
Currently the "BARBER-HUB" watermark is centered and large (`text-2xl/3xl`). User wants it **60% smaller**, positioned at the **top-center**, styled as a **Reddit-style transparent pill** with a thin rounded border.

**Changes in `src/pages/WatchFeed.tsx` and `src/components/BrandedVideoPlayer.tsx`:**
- Move watermark from `inset-0 items-center justify-center` to `top-3 left-1/2 -translate-x-1/2`
- Reduce text to `text-[10px]` with `tracking-[0.2em]`
- Add pill styling: `rounded-full border border-white/30 px-3 py-1 bg-black/20 backdrop-blur-sm`
- Keep "BARBER" in `text-white/40` and "-HUB" in `text-primary/50` (slightly more visible at small size)

### 2. Delete button doesn't work (RLS blocks it)
The delete button exists and is visible, but the actual database delete **fails silently** because the RLS policy on `creations` requires `has_role(auth.uid(), 'barber')`. Only 5 out of all users have the barber role entry in `user_roles`. Most barbers registered via `user_type = 'barber'` on profiles but were never added to `user_roles`.

**Fix: New migration** — Replace the ALL policy with a simpler DELETE policy:
```sql
DROP POLICY "Barbers can manage their own creations" ON creations;

-- Separate policies for INSERT, UPDATE, DELETE
CREATE POLICY "Owners can insert creations" ON creations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM barber_profiles bp
    WHERE bp.id = creations.barber_id AND bp.user_id = auth.uid()
  ));

CREATE POLICY "Owners can update creations" ON creations
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM barber_profiles bp
    WHERE bp.id = creations.barber_id AND bp.user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete creations" ON creations
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM barber_profiles bp
    WHERE bp.id = creations.barber_id AND bp.user_id = auth.uid()
  ));
```
This removes the `has_role` check so any authenticated user who owns the barber profile can delete their own creations.

**Also in `src/pages/BarberPublicProfile.tsx`:** Add better error feedback — log the actual error message in the toast so users can report issues.

### 3. Clicking hero video navigates to random content
`DynamicBattleHero.tsx` line 312: `onClick={() => navigate('/watch')}` — goes to the WatchFeed without specifying which video. The feed then shows whatever content loads first.

**Fix:**
- In `DynamicBattleHero.tsx`: Change to `navigate('/watch?video=' + fallbackVideo.barber_id)` to pass the barber whose video was shown.
- In `WatchFeed.tsx`: Read `?video=` query param. If present, find that barber's video in the feed and set `activeIndex` to its position, so the user lands on the exact video they clicked.

---

## Files to modify

| File | Changes |
|------|---------|
| `src/pages/WatchFeed.tsx` | Shrink watermark to small pill at top-center |
| `src/components/BrandedVideoPlayer.tsx` | Same watermark pill treatment |
| `src/pages/BarberPublicProfile.tsx` | Improve delete error feedback |
| `src/components/DynamicBattleHero.tsx` | Pass barber ID in navigation to `/watch?video=` |
| New migration | Replace creations ALL policy with separate INSERT/UPDATE/DELETE without `has_role` |

