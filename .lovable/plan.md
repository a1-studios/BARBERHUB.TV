

# Portfolio Video Management, Hero Randomization & Profile Fixes

## What We're Building

Six improvements across portfolio management, sponsor display, video randomization, and profile UX.

---

### 1. Allow barbers to delete portfolio videos
The delete button already exists for portfolio items in `BarberPublicProfile.tsx` (line 572-581) but the actual DB delete may fail due to missing RLS policies.

**Changes:**
- **`BarberPublicProfile.tsx`**: The delete handler at line 115 tries to delete from Supabase Storage, but portfolio media lives on R2 (not Supabase Storage). Fix the handler to only delete the `creations` DB row (the R2 URL stays orphaned -- acceptable for now). Ensure the delete button is visible for video items (it already renders for owners via `isOwner` check).
- **New migration**: Add a DELETE RLS policy on the `creations` table so authenticated users can delete their own rows (join through `barber_profiles` to match `user_id`).

---

### 2. Randomize sponsor ad in DynamicBattleHero & reposition
Currently `SponsorStrip` always picks `sponsors[0]`. Also, user wants it positioned bottom-right next to the barber name, not above it.

**Changes in `DynamicBattleHero.tsx`:**
- In `SponsorStrip`, pick a random sponsor using `useMemo(() => sponsors[Math.floor(Math.random() * sponsors.length)], [sponsors])`.
- Move the `<SponsorStrip />` from above the name row to inside the name row, on the right side (next to the mute button area), so it sits bottom-right.

---

### 3. Randomize hero fallback video
Currently the `fallbackHeroVideo` query fetches up to 10 videos but always uses `valid[0]`.

**Changes in `DynamicBattleHero.tsx`:**
- Replace `valid[0]` with `valid[Math.floor(Math.random() * valid.length)]` to pick a random video each time the query runs.

---

### 4. Allow multiple video uploads (5GB cumulative cap)
Currently limited to 1 video in the portfolio. User wants multiple videos with a shared 5GB cap across all media (images + videos).

**Changes in `BarberPublicProfile.tsx`:**
- Remove the `videoCount >= 1` guard. Replace with a cumulative size check: query total media size from the `creations` table (we'll store `file_size` on each creation).
- Since `creations` table likely doesn't have a `file_size` column, we can enforce the cap client-side by tracking uploaded sizes. Internally cap at 5GB total -- if the new file would exceed 5GB, block with a toast error.
- Update the UI to remove "0/1 video" labeling. Just show count of items.
- Update the "Upload Video" button to not disable after 1 video.

---

### 5. Center avatar in barber profile hero
The hero section uses `items-start` on the flex container (line 273), causing the avatar to align top-left on mobile.

**Changes in `BarberPublicProfile.tsx`:**
- Change `items-start` to `items-center` on the flex container.
- On mobile (single column), center the AvatarCrest with `mx-auto`.

---

### 6. Fix 403 on barber profile access
The profile page queries `public_barber_profiles` (a view) and `barber_profiles`. If the visitor isn't authenticated or doesn't have SELECT access, they get 403.

**Changes:**
- **New migration**: Ensure `barber_profiles` has a SELECT policy for authenticated users (at minimum for the columns needed: `active_subscription_tier`, `m4m_certified`, etc.). The `public_barber_profiles` view likely runs as `security_definer` already, but the direct `barber_profiles` query at line 56 needs its own policy.
- Add a SELECT policy: `authenticated` users can read any `barber_profiles` row (public data).

---

## Files to modify

| File | Changes |
|------|---------|
| `src/pages/BarberPublicProfile.tsx` | Fix delete handler (skip storage delete for R2 URLs), remove 1-video cap, center avatar, remove size labels |
| `src/components/DynamicBattleHero.tsx` | Randomize sponsor pick, reposition strip to bottom-right, randomize fallback video selection |
| New migration | DELETE policy on `creations`, SELECT policy on `barber_profiles` for authenticated users |

