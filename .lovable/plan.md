

## System Audit & Fixes — Implementation Plan

### 1. Twilio Purge (3 deletions)

- **Delete `src/components/streaming/TwilioVideoPlayer.tsx`** — unused after migration, no imports reference it
- **Delete `supabase/functions/generate-battle-token/index.ts`** — duplicate of `generate-livekit-token` with identical logic; nothing calls it (confirmed via search)
- **Remove Twilio comment** on `CameraStudio.tsx` line 402 (`{/* Twilio connect/disconnect */}`)

No other Twilio references exist outside `types.ts` (which is auto-generated and has a `twilio_room_sid` column — harmless DB column, not code).

---

### 2. Fix R2 Public URL (Bug)

**File:** `supabase/functions/get-r2-presigned-url/index.ts` line 71

Current code constructs `publicUrl` from the S3 API endpoint, which is private and returns 403s.

**Fix:** Read `R2_PUBLIC_URL` from env (already added as a secret) and construct:
```
const publicUrl = `${R2_PUBLIC_URL}/${key}`;
```

---

### 3. Fix Audio in Egress + BattleTheater

**Egress (start-battle-egress):** The `RoomCompositeEgress` already captures the full room (video + audio) — this is the default behavior. No code change needed on the egress side; the SDK's `EncodedFileOutput` for MP4 inherently includes audio.

**BattleTheater (the real bug):** The `<video>` elements on lines 210-215 and 260-265 have `autoPlay` but **no `muted` attribute**, which is good. However, browsers block autoplay with audio unless the user has interacted. The fix:
- Start videos `muted` with autoplay
- Add an "Unmute" button overlay that users tap to enable audio
- This follows the standard web pattern for autoplay compliance

---

### 4. Fix StreamControlPanel Toggle Desync

**Problem:** `StreamControlPanel.tsx` lines 69-85 toggle raw `MediaStream` tracks directly, but LiveKit manages tracks through `Room.localParticipant`. This causes state to desync.

**Fix in `useLiveKitStream.tsx`:**
- Expose `toggleAudio()` and `toggleVideo()` methods that call `roomRef.current?.localParticipant.setMicrophoneEnabled()` and `setCameraEnabled()`
- Return these from the hook

**Fix in `StreamControlPanel.tsx`:**
- Replace inline `localStream.getAudioTracks()` / `getVideoTracks()` toggles with the hook's `toggleAudio()` / `toggleVideo()` calls

---

### 5. Fix useLiveKitStream Auth Header

**File:** `src/hooks/useLiveKitStream.tsx` line 62

The `supabase.functions.invoke` call doesn't pass the Authorization header, but `generate-livekit-token` requires a Bearer token.

**Fix:** Get fresh session token before invoking:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const { data, error } = await supabase.functions.invoke('generate-livekit-token', {
  body: { battleId },
  headers: { Authorization: `Bearer ${session?.access_token}` },
});
```

---

### 6. R2 Folder Partitioning + Portfolio Migration

**Update `src/lib/storage.ts`** — add two new upload helpers:
- `uploadPortfolioImage(file, userId)` — key: `portfolios/{userId}/{uuid}.{ext}`
- `uploadEducationContent(file, creatorId)` — key: `education/{creatorId}/{uuid}.{ext}`

Both use the same `get-r2-presigned-url` edge function (already supports arbitrary keys).

**Rewrite `PortfolioManager.tsx`:**
- Replace `supabase.storage.from('portfolios').upload(...)` with `uploadPortfolioImage()` from `src/lib/storage.ts`
- Replace `supabase.storage.from('portfolios').remove(...)` with a delete call (add a new `deleteR2Object` helper or accept that deletes can be handled later)
- Remove mock data — load real portfolio from a DB table or profile field

The existing recordings already use `recordings/{battleId}/` prefix. Battle video uploads use `battles/{battleId}/`. This establishes the partitioned structure:
```
battle-submissions/
  recordings/    ← LiveKit egress MP4s
  battles/       ← manual video submissions
  portfolios/    ← barber portfolio images
  education/     ← tutorial content
```

---

### 7. R2 CORS for Media Playback

If R2 videos return 403 or CORS errors during playback, you need to configure CORS on the R2 bucket. After implementation, I'll provide the exact CORS JSON you need to paste into the Cloudflare R2 dashboard:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

This must be set manually in **Cloudflare Dashboard → R2 → battle-submissions → Settings → CORS Policy**.

---

### Files Summary

| Action | File |
|--------|------|
| Delete | `src/components/streaming/TwilioVideoPlayer.tsx` |
| Delete | `supabase/functions/generate-battle-token/index.ts` |
| Fix | `supabase/functions/get-r2-presigned-url/index.ts` (R2_PUBLIC_URL) |
| Fix | `src/hooks/useLiveKitStream.tsx` (auth header + toggle methods) |
| Fix | `src/components/streaming/StreamControlPanel.tsx` (use hook toggles) |
| Fix | `src/pages/BattleTheater.tsx` (autoplay muted + unmute button) |
| Fix | `src/pages/CameraStudio.tsx` (remove Twilio comment) |
| Update | `src/lib/storage.ts` (add portfolio/education upload helpers) |
| Rewrite | `src/components/profiles/PortfolioManager.tsx` (R2 uploads) |

