

## Add Platform Promo Video to Watch Feed

### What
Copy the uploaded video (`Image_Animation_To_Video.mp4`) into `public/videos/` and inject it as a "platform" content type into the WatchFeed's interleaving algorithm. This seeds the feed with content even when the database has no battle submissions yet, bootstrapping the endless scroll experience.

### Changes

| File | Action |
|------|--------|
| `public/videos/promo-hero.mp4` | **Copy** uploaded video here |
| `src/pages/WatchFeed.tsx` | **Modify** — Add a `"platform"` type to the `FeedItem` union. Define a static array of platform promo videos (starting with this one) that get injected into the feed every 4 items. When the DB has zero battle videos, the platform promos become the backbone of the feed, looped to fill the scroll. Update the video renderer to handle the `"platform"` type with a branded "Barber Battles" overlay badge (similar to the educator "Masterclass" badge). |

### Feed Algorithm Update
```text
Current:  video, video, educator, video, sponsor, ...
Updated:  video, video, educator, platform, video, sponsor, ...
                                  ^^^^^^^^
Empty DB: platform, educator, platform, sponsor, platform, ...
```

The platform promos loop infinitely so the feed never feels empty. As real battle content grows, the promos naturally thin out via the interleave ratio.

### FeedItem Type Addition
```typescript
type: "video" | "sponsor" | "educator" | "platform"
```

Platform items render with the same full-screen video player but with a subtle branded badge ("Barber Battles Official") in the top-left corner.

