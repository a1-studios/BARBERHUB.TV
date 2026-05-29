## Landing page revamp

### 1. Replace static "Watch Feed" strip with a Feature Highlight Reel
Repurpose the `WatchFeedStrip` slot into a single, taller "highlight box" that auto-rotates through the platform's killer features instead of fake clip thumbnails.

Slides (auto-advance every ~4s, swipeable):
- **Global Map** — preview of Mapbox dark style with pulsing pins ("Find barbers anywhere")
- **Find a Barber Near You** — search bar mock + nearby card snippet
- **Rotating World Flags** — horizontal flag ticker representing global reach (uses country emoji flags, marquee animation)
- **Live Battles / Stream** — thumbnail with pulsing LIVE dot
- **Earn BB** — spinning coin + "+15 BB on signup"

New file: `src/components/landing/FeatureHighlightReel.tsx`. Replaces `<WatchFeedStrip />` in `VelvetRopeLanding.tsx`. Same vertical footprint (`flex-1 min-h-0`).

### 2. Two-color slogan
Update `LegendsHeadline.tsx`:
- "WHERE" → orange
- "BARBERS" → white
- "BECOME" → orange
- "LEGENDS" → white (keep current glow, swap to white drop-shadow)

### 3. Rotating CTA button upgrades (`RotatingJoinCTA.tsx`)
- Add **STREAM** and **EARN-BB** to the rotation list → `JOIN, WIN, WATCH, VOTE, CHALLENGE, STREAM, EARN-BB`
- For `EARN-BB`, render the spinning BB coin (`RotatingBBCoin`) inline next to the word
- Text color → signature orange (`text-orange-500`) instead of cyan-100; keep cyan neon outline
- Increase button size ~10%: `h-11 → h-12`, `px-8 → px-9`, `text-sm → text-[15px]`

### 4. Unified Email/Phone + OTP box, moved under the CTA
Remove the current inline sign-in form above the CTA. New component `src/components/landing/InlineOtpBox.tsx` placed directly under the rotating CTA.

Behavior:
- Single input with **morphing placeholder** that cycles "Email" ⇄ "Phone" every 2s (pauses when focused/typed)
- Orange glow outline (`border-orange-500/60 shadow-[0_0_18px_rgba(249,115,22,0.45)]`)
- "Go" button → on submit, detects email vs phone via regex, calls the existing OTP send path:
  - Email → `supabase.auth.signInWithOtp({ email })`
  - Phone → `supabase.auth.signInWithOtp({ phone })` (Twilio SMS OTP, per existing `twilio-sms-otp` integration)
- After send, swap input for 6-digit code entry (6 boxed cells) and verify via `supabase.auth.verifyOtp`
- On success, route per role default

### 5. Layout order in `VelvetRopeLanding.tsx`
1. Header
2. Two-color headline
3. Feature Highlight Reel (flex-1)
4. Rotating CTA + "+15 BB" subtext
5. Inline OTP box (orange glow)
6. Stats row
7. Footer sign-in link (kept for returning users)

### Technical notes
- Files created: `FeatureHighlightReel.tsx`, `InlineOtpBox.tsx`
- Files edited: `LegendsHeadline.tsx`, `RotatingJoinCTA.tsx`, `VelvetRopeLanding.tsx`
- Files removed from landing: inline email/phone form block (logic replaced by `InlineOtpBox`)
- Reuse `RotatingBBCoin` from `src/components/economy/RotatingBBCoin.tsx`
- Flags: use unicode regional indicator emojis in a horizontally-scrolling marquee (no extra deps)
- OTP path uses existing Supabase auth + Twilio SMS OTP edge functions already wired in the project
