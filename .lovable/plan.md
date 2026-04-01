

# Fix Broadcast Studio & Viewer — Camera, Controls, Metrics, Engagement, Quality

## Problems

1. **Camera only works on selfie (front)** — No camera flip button in BroadcastStudio; LiveKit defaults to front-facing. Need a toggle to switch `facingMode` between `user` and `environment`.
2. **No visible End Stream button** — The red `PhoneOff` button exists but is buried at the bottom with no label. Needs to be clearly labeled "END STREAM" and more prominent.
3. **No metrics in Studio** — Broadcaster can't see viewer count, duration, or connection quality while live.
4. **Viewer page has no engagement actions** — When a viewer clicks into a stream, they only see the video with no like, follow, donate, or comment functionality. Need TikTok-style action buttons on the viewer page.
5. **Low stream quality** — LiveKit defaults to low resolution. Need to configure video publish options to 720p+ with higher bitrate.

## Changes

### 1. Upgrade `BroadcastStudio.tsx` — Full Studio Controls

**Camera flip**: Add a `SwitchCamera` button that calls `room.switchActiveDevice('videoinput', deviceId)` or toggles `facingMode` constraint. Use LiveKit's `localParticipant.setCameraEnabled(true, { facingMode })` pattern.

**Metrics overlay**: Show viewer count (from `room.numParticipants - 1`), live duration (timer), and a "LIVE" badge with viewer count. Subscribe to `RoomEvent.ParticipantConnected/Disconnected`.

**End Stream button**: Make it clearly labeled "END STREAM" with text, not just an icon.

**Video quality**: Pass `videoCaptureDefaults` and `publishDefaults` to `LiveKitRoom` for 720p at higher bitrate:
```typescript
<LiveKitRoom
  options={{
    videoCaptureDefaults: { resolution: { width: 1280, height: 720, frameRate: 30 } },
    publishDefaults: { videoCodec: 'h264', videoSimulcastLayers: [{ width: 640, height: 360 }] },
  }}
/>
```

### 2. Upgrade `BroadcastViewer.tsx` — Engagement Actions

Add a right-side action column (TikTok-style) with:
- **Heart/Like** toggle (using `creator_likes`)
- **Follow** toggle (using `creator_follows`)
- **Donate** button (opens `DonationModal`)
- **Viewer count** badge
- **Barber name** overlay

Fetch `barber_profiles.user_id` alongside name to power engagement mutations. Reuse the `EngagementActions` pattern from `LiveBarberStreams.tsx` but styled vertically for fullscreen.

### 3. Higher Quality Video Capture

In both `BroadcastStudio.tsx` and `generate-broadcast-token`, ensure:
- Client-side: `videoCaptureDefaults` set to 720p/30fps
- Token grants: no bandwidth restrictions

## File Summary

| File | Changes |
|------|---------|
| `src/pages/BroadcastStudio.tsx` | Add camera flip, viewer metrics, duration timer, labeled end button, HD video options |
| `src/pages/BroadcastViewer.tsx` | Add vertical engagement actions (like/follow/donate), fetch barber user_id |

No edge function or migration changes needed.

