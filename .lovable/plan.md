## Fix portfolio video player: mobile dimensions + auto-replay

The Dialog I just added uses `aspect-video` (16:9 landscape) and no replay. Portfolio clips are mobile-shot 9:16 verticals and need to loop like the Watch feed.

### Changes

**1. `src/pages/BarberPublicProfile.tsx` — portfolio video Dialog**
- Swap `DialogContent` sizing: use a mobile-shaped container (`max-w-[420px] w-full aspect-[9/16]`) on a black background, no padding.
- Pass `loop={true}` to `SmartVideoPlayer` so the clip auto-restarts when it ends (matching Watch feed's continuous playback behavior).
- Keep `controls`, `tapToToggle`, `showCenterPlayButton`, `forceActive`, `autoPlayWhenVisible`, `muted={false}`.

**2. `src/components/profiles/PortfolioManager.tsx` — same Dialog**
- Identical fix: `max-w-[420px] aspect-[9/16]` container + `loop={true}`.

### Why loop instead of replay button
`SmartVideoPlayer`'s `enableReplay` only renders a manual replay button after `ended`. Watch feed pairs it with `handleVideoEnded` that advances the feed, so the user never sits on a stalled frame. In the portfolio modal there's no next item — the cleanest match to "videos that don't replay" is `loop={true}` so the same clip plays continuously until the user closes the dialog.

### Out of scope
No changes to `SmartVideoPlayer` itself, no changes to Watch feed, no changes to thumbnail tile grid.