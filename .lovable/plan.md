

# Fix Portfolio Upload, Delete, and Video Tab Integration

## Root Causes Found

After auditing the code and database:

1. **Upload only works once on mobile**: The hidden file inputs use static `id` attributes (`portfolio-video-upload`, `portfolio-image-upload`) and `document.getElementById()` to trigger clicks. After the first upload completes and `event.target.value = ''` resets the input, mobile browsers (especially Safari) often refuse to re-trigger the same input element. Fix: use React `useRef` and force re-mount with a `key` prop tied to an upload counter.

2. **Video tab doesn't create portfolio items**: `BarberVideoSection` (the Video tab) only writes to `barber_profiles.featured_video_id`. It never inserts into the `creations` table. So videos uploaded from the Video tab don't appear in the Portfolio tab. Fix: after updating `featured_video_id`, also insert a `creations` row so it shows in the portfolio grid.

3. **Delete button hidden behind native video controls**: Portfolio video items render `<video controls>` which places native browser controls over the entire video surface. The delete button at `top-2 left-2` gets trapped behind these native controls and is untappable. Fix: remove `controls` from the portfolio grid thumbnails (they're just previews) and show a play icon overlay instead.

4. **Extension-based video detection is fragile**: The regex `\.(mp4|mov|avi|webm)$/i` works for R2 URLs without query params, but `category` is set to `'haircut'` for all portfolio uploads from the image button and `'video'` only if explicitly passed. Fix: also check `category === 'video'` in addition to the extension regex.

## Changes

### File: `src/pages/BarberPublicProfile.tsx`

**A. Replace static file input IDs with refs + re-mount key**
- Add `useRef` for image and video file inputs
- Add `uploadKey` state counter, incremented after each upload
- Use `key={uploadKey}` on the file inputs so they re-mount after each upload
- Replace all `document.getElementById('portfolio-...')?.click()` with `ref.current?.click()`

**B. Fix video detection in portfolio grid**
- Change `creation.media_url?.match(/\.(mp4|mov|avi|webm)$/i)` to also check `creation.category === 'video'`
- Same for `imageCount` / `videoCount` counters

**C. Remove `controls` from portfolio video thumbnails**
- Remove `controls` attribute from `<video>` in the portfolio grid
- Add a centered play icon overlay so users know it's a video
- This ensures the delete button is always tappable

**D. Make delete button more prominent**
- Increase size slightly and add `z-20` to ensure it's above any overlay

### File: `src/components/barber/BarberVideoSection.tsx`

**E. Also create a `creations` record on Video tab upload**
- After successfully writing `featured_video_id` to `barber_profiles`, also insert into `creations` with `category: 'video'` and `title: 'Featured Video'`
- This requires passing `barberProfileId` (the `barber_profiles.id`) as a prop
- Query it from `barber_profiles` using `user_id` if not already available

### File: `src/pages/BarberPublicProfile.tsx` (Video tab section)

**F. Pass barber profile ID to BarberVideoSection**
- Pass `barberProfileId={barberData?.barber_id}` so the Video tab can insert into `creations`

## Technical Details

```text
Upload flow (fixed):
  1. User taps "Upload Video" button
  2. ref.current.click() opens file picker
  3. File selected -> upload to R2 -> insert into creations table
  4. uploadKey++ forces input re-mount
  5. User can immediately upload another file

Video tab flow (new):
  1. User uploads from Video tab
  2. File uploaded to R2 -> barber_profiles.featured_video_id updated
  3. NEW: Also insert into creations (barber_id, media_url, category='video')
  4. Portfolio tab now shows the video too

Delete flow (fixed):
  1. Portfolio grid shows video thumbnail WITHOUT native controls
  2. Delete button always visible, z-20, not blocked by controls
  3. User taps delete -> confirm -> DELETE FROM creations -> refetch
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/BarberPublicProfile.tsx` | Replace static IDs with refs, add re-mount key, fix video detection, remove native controls from thumbnails, pass barberProfileId to VideoSection |
| `src/components/barber/BarberVideoSection.tsx` | Accept barberProfileId prop, insert creations record on upload |

