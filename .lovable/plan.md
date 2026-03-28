

## LiveKit + Cloudflare R2 Migration — Implementation Plan

All 6 secrets confirmed in Supabase. No action needed from you — ready to implement.

---

### Phase 1: New Foundation Files

**1. Install dependencies**
- Add `livekit-client` and `@livekit/components-react`
- Remove `twilio-video`

**2. `src/lib/livekit.ts`** — Client-side LiveKit helpers
- `createBattleRoom()` — returns configured `Room` instance (VP8, adaptive stream, dynacast)
- `connectToRoom(serverUrl, token)` — connect + return Room
- Export relevant types

**3. `src/lib/storage.ts`** — R2 upload helper
- `uploadBattleVideo(file, battleId)` — calls `get-r2-presigned-url` edge function, then PUTs directly to R2
- `uploadBattleImage(file, path)` — same pattern for images
- Returns public R2 URL

**4. `supabase/functions/generate-livekit-token/index.ts`** — Rewrite existing function
- Replace Twilio SDK with `npm:livekit-server-sdk` for token generation
- Same auth/battle verification logic stays
- Uses `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
- Returns `{ token, serverUrl, roomName, barberPosition, identity }`

**5. `supabase/functions/get-livekit-viewer-token/index.ts`** — New viewer token function
- Subscribe-only token (`canPublish: false, canSubscribe: true`)
- Replaces `get-viewer-token`

**6. `supabase/functions/get-r2-presigned-url/index.ts`** — Presigned upload URLs
- Uses `npm:@aws-sdk/client-s3` + `npm:@aws-sdk/s3-request-presigner`
- S3Client with `region: 'auto'`, endpoint from `R2_ENDPOINT`
- Generates presigned PUT URL for bucket `battle-summissions`

---

### Phase 2: Rewrite Hooks & Components

**7. `src/hooks/useBattleVideoRoom.tsx`** — Full rewrite
- Replace all `twilio-video` imports with `livekit-client` (`Room`, `RoomEvent`, `Track`, `RemoteParticipant`)
- `connect()` calls `generate-livekit-token`, then `room.connect(serverUrl, token)`
- Track events via `RoomEvent.TrackSubscribed/Unsubscribed/ParticipantConnected/Disconnected`
- Same external API shape preserved (no breaking changes for consumers)

**8. `src/hooks/useTwilioStream.tsx` → `src/hooks/useLiveKitStream.tsx`**
- Same hook API (`startStream`, `endStream`, `isStreaming`, `canStart`)
- Internally uses LiveKit Room connection instead of Twilio
- Calls `generate-livekit-token` instead of `create-twilio-room`

**9. `src/components/streaming/BattleVideoContainer.tsx`**
- Remove `twilio-video` import
- `VideoAttach` component uses generic approach: LiveKit tracks have `.attach()` just like Twilio
- Type the tracks as `any` or create a simple `{ attach(): HTMLMediaElement; detach(): HTMLMediaElement[] }` interface for compatibility

**10. `src/components/streaming/StreamControlPanel.tsx`**
- Import `useLiveKitStream` instead of `useTwilioStream`

**11. `src/components/creator/CreateBattleDrawer.tsx`**
- Change default streaming type from `'twilio'` to `'livekit'`
- Update `STREAMING_TYPES` label

---

### Phase 3: Edge Function Cleanup

**12. Rewrite `supabase/functions/generate-battle-token/index.ts`**
- Full replacement: Twilio SDK → LiveKit `AccessToken` from `npm:livekit-server-sdk`
- Remove all Twilio room creation logic
- Keep same auth/battle validation

**13. Rewrite `supabase/functions/sync-battle-viewers/index.ts`**
- Replace Twilio REST API calls with LiveKit `RoomServiceClient.listParticipants()`
- Uses `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`

**14. Delete Twilio edge functions**
- `supabase/functions/create-twilio-room/index.ts`
- `supabase/functions/end-twilio-stream/index.ts`
- `supabase/functions/get-viewer-token/index.ts`
- `supabase/functions/twilio-webhook/index.ts`

---

### Phase 4: Video Submission with R2

**15. `src/components/battles/VideoSubmissionModal.tsx`**
- Add file upload tab using `uploadBattleVideo()` from `src/lib/storage.ts`
- Uploaded file goes to R2, URL passed to `submit-battle-video`

---

### Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/livekit.ts` |
| Create | `src/lib/storage.ts` |
| Create | `supabase/functions/get-livekit-viewer-token/index.ts` |
| Create | `supabase/functions/get-r2-presigned-url/index.ts` |
| Rewrite | `src/hooks/useBattleVideoRoom.tsx` |
| Rewrite | `src/hooks/useTwilioStream.tsx` → `src/hooks/useLiveKitStream.tsx` |
| Rewrite | `supabase/functions/generate-battle-token/index.ts` |
| Rewrite | `supabase/functions/sync-battle-viewers/index.ts` |
| Update | `src/components/streaming/BattleVideoContainer.tsx` |
| Update | `src/components/streaming/StreamControlPanel.tsx` |
| Update | `src/components/creator/CreateBattleDrawer.tsx` |
| Update | `src/components/battles/VideoSubmissionModal.tsx` |
| Update | `package.json` (add livekit-client, @livekit/components-react; remove twilio-video) |
| Delete | `supabase/functions/create-twilio-room/index.ts` |
| Delete | `supabase/functions/end-twilio-stream/index.ts` |
| Delete | `supabase/functions/get-viewer-token/index.ts` |
| Delete | `supabase/functions/twilio-webhook/index.ts` |

### Technical Details

**LiveKit token (edge function)**:
```typescript
import { AccessToken } from 'npm:livekit-server-sdk';
const at = new AccessToken(apiKey, apiSecret, { identity, ttl: '4h' });
at.addGrant({ roomJoin: true, room: roomName, canPublish: true });
return await at.toJwt();
```

**R2 presigned URL (edge function)**:
```typescript
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner';
const s3 = new S3Client({ region: 'auto', endpoint, credentials });
const url = await getSignedUrl(s3, new PutObjectCommand({
  Bucket: 'battle-summissions', Key: path
}), { expiresIn: 3600 });
```

**Client LiveKit connection**:
```typescript
import { Room, RoomEvent } from 'livekit-client';
const room = new Room({ adaptiveStream: true, dynacast: true });
await room.connect(serverUrl, token);
room.on(RoomEvent.TrackSubscribed, (track) => { /* attach */ });
```

