

## LiveKit Egress — Auto-Record Battles to R2

LiveKit Egress is a server-side feature that records room audio/video and outputs directly to S3-compatible storage (your R2 bucket). The flow:

```text
Battle goes LIVE
  → Edge function starts a RoomCompositeEgress via LiveKit API
  → LiveKit server records the room as MP4
  → When recording finishes, LiveKit sends a webhook
  → Webhook edge function receives it, extracts the R2 file path
  → Updates battles table with the public MP4 URL
  → BattleTheater plays the recording
```

---

### What will be built

**1. `supabase/functions/start-battle-egress/index.ts`** — New edge function

Called internally (from `generate-livekit-token`) when a battle transitions to `live`. Uses `livekit-server-sdk`'s `EgressClient` to start a `RoomCompositeEgress`:

- Connects to LiveKit using `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Targets R2 via S3-compatible output config:
  ```
  s3: {
    accessKey: R2_ACCESS_KEY_ID,
    secret: R2_SECRET_ACCESS_KEY,
    endpoint: R2_ENDPOINT,
    bucket: "battle-summissions",
    region: "auto",
    forcePathStyle: true
  }
  ```
- Output path: `recordings/{battleId}/{timestamp}.mp4`
- Stores the egress ID in the `battles` table (new column `egress_id`) for tracking

**2. Update `supabase/functions/generate-livekit-token/index.ts`**

After transitioning battle status to `live`, call `start-battle-egress` internally (or inline the egress start logic) to begin recording. Only triggers once (checks if `egress_id` is already set).

**3. `supabase/functions/livekit-egress-webhook/index.ts`** — New edge function

Receives LiveKit webhook POST events. This function:

- Verifies the webhook signature using `WebhookReceiver` from `livekit-server-sdk` (uses `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET`)
- Handles `egress_ended` event type
- Extracts the output file path from the egress result
- Constructs the public URL: `{R2_PUBLIC_URL}/recordings/{battleId}/{file}.mp4`
- Updates the `battles` table: sets `barber_1_video_url` (or `barber_2_video_url`) with the recording URL
- If both videos are now present, transitions battle to `voting` status

Important: This function must have `verify_jwt = false` since LiveKit sends webhooks without Supabase auth.

**4. Database migration**

Add an `egress_id` column to the `battles` table to track active egress sessions:
```sql
ALTER TABLE battles ADD COLUMN IF NOT EXISTS egress_id TEXT;
```

**5. Update `BattleTheater.tsx`**

The component already reads `barber_1_video_url` and `barber_2_video_url` and passes them to `HLSVideoPlayer`. Since recordings will be MP4 (not HLS), add a fallback: if the URL ends in `.mp4`, render a native `<video>` element instead of the HLS player.

---

### LiveKit Webhook Setup (Your action required after implementation)

You will need to configure the webhook URL in your LiveKit Cloud dashboard:
- Go to LiveKit Cloud → Project Settings → Webhooks
- Add URL: `https://msuepyfssovvkjzpfjzu.supabase.co/functions/v1/livekit-egress-webhook`

---

### Config changes

- Add `verify_jwt = false` for `livekit-egress-webhook` in `supabase/config.toml`

### Files summary

| Action | File |
|--------|------|
| Create | `supabase/functions/start-battle-egress/index.ts` |
| Create | `supabase/functions/livekit-egress-webhook/index.ts` |
| Update | `supabase/functions/generate-livekit-token/index.ts` (trigger egress) |
| Update | `supabase/config.toml` (webhook JWT bypass) |
| Update | `src/pages/BattleTheater.tsx` (MP4 fallback) |
| Migration | Add `egress_id` column to `battles` |

