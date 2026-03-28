

## Remove YouTube & Build Native Barber Hub Video Player

### What's happening now
YouTube iframes are embedded in 3 places across the app. When videos are uploaded to R2, the URL gets wrongly stuffed into a YouTube embed URL, causing broken playback. Additionally, any working YouTube embeds show YouTube's branding, logo, and controls — not yours.

### What we'll build

**A single `BrandedVideoPlayer` component** that replaces all YouTube iframes and existing video players with a fully native HTML5 `<video>` element featuring Barber Hub branding.

#### Player features
- Custom play button with Barber Hub styling (gold/primary gradient circle with scissors or custom icon)
- Branded overlay with "BARBER HUB" text watermark (top corner, semi-transparent)
- Native HTML5 controls (no YouTube logo, no YouTube recommendations)
- Support for R2 URLs (MP4/WebM), poster thumbnails, and live badge
- Fullscreen, picture-in-picture support
- Viewer count overlay for live content

#### Files to change

| File | What changes |
|------|-------------|
| **NEW** `src/components/BrandedVideoPlayer.tsx` | Single unified player: native `<video>` with custom play overlay, Barber Hub logo watermark, poster state, and controls |
| `src/components/barber/BarberVideoSection.tsx` | Remove YouTube iframe (lines 204-250). Use `BrandedVideoPlayer` for all `videoId` values — treat them as direct URLs, not YouTube IDs |
| `src/pages/WatchFeed.tsx` | Remove `getYouTubeId()` helper and YouTube iframe branch (lines 259-273). All media URLs go through `BrandedVideoPlayer` or native `<video>` |
| `src/components/battles/SubmissionGuidelines.tsx` | Remove YouTube-specific text ("YouTube videos only", "Stream on YouTube", "YouTube saves your video"). Replace with R2 direct upload instructions |
| `src/components/battles/FullscreenBattleVideoModal.tsx` | Already uses `HLSVideoPlayer` — swap to `BrandedVideoPlayer` |
| `src/components/VideoPlayer.tsx` | Deprecate — functionality absorbed into `BrandedVideoPlayer` |
| `src/components/battles/HLSVideoPlayer.tsx` | Deprecate — functionality absorbed into `BrandedVideoPlayer` |

#### BrandedVideoPlayer design

```text
┌─────────────────────────────┐
│  BARBER HUB          🔴LIVE │  ← Semi-transparent brand + live badge
│                             │
│                             │
│         ┌───────┐           │
│         │  ▶︎  │           │  ← Custom play button (gold gradient)
│         └───────┘           │
│                             │
│  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  │  ← Native controls bar
└─────────────────────────────┘
```

- Before play: poster image + branded play button overlay
- During play: controls appear on hover/tap, brand watermark stays in corner
- No third-party logos anywhere

#### Technical approach
- Pure HTML5 `<video>` element — no plugins or external libraries needed
- MP4 and WebM playback is natively supported by all modern browsers
- R2 serves files over HTTPS with proper `Content-Type` headers — works directly with `<video src="...">`
- Custom controls built with React state (`playing`, `currentTime`, `duration`) for full brand control
- Framer Motion for play button animation and transitions

### No plugins required
HTML5 `<video>` handles MP4/WebM natively. R2 serves files as static assets. No HLS library, no video.js, no external player SDK needed for recorded content playback.

