

## M4M Heartbeat — Fix Icon, Add Barber Certification Flow & QR Code

### Problem
1. The SVG icon doesn't match the reference (should be a handshake forming a heart shape, like the uploaded image)
2. When a barber clicks the heart on their own profile, it should start the certification flow — not show the client verification modal
3. After certification, the barber gets a PDF + QR code that clients scan to log sessions

### Changes

#### 1. `src/components/m4m/M4MHeartbeat.tsx`
- Redesign the `HandsHeartIcon` SVG to match the reference: two hands shaking inside a heart outline (clean, geometric style matching the uploaded screenshot)
- Add new prop `isOwnProfile?: boolean` to distinguish barber viewing own profile vs others
- When `isOwnProfile && !certified`: clicking opens `M4MCertificationModal` (new) instead of verification modal
- When `isOwnProfile && certified`: clicking opens a modal showing their QR code + download PDF button
- When `!isOwnProfile`: clicking opens the existing client verification modal (scan QR / enter code)

#### 2. New: `src/components/m4m/M4MCertificationModal.tsx`
- Multi-step dialog for barber self-certification (Phase 1 — free):
  - Step 1: "What is Minutes for Men?" — brief explanation + agree to pledge
  - Step 2: Confirm commitment checkbox ("I pledge to offer 8-minute peer support conversations")
  - Step 3: Success — shows "You are now M4M Certified!" with:
    - A generated QR code (encodes a URL like `{appUrl}/m4m/verify/{barberUserId}`)
    - "Download PDF" button that generates a printable certificate with the QR code embedded
- On completion: updates `barber_profiles.m4m_certified = true` via Supabase

#### 3. New: `src/components/m4m/M4MQRCodeModal.tsx`
- For certified barbers clicking their heart: shows their QR code + "Download Certificate PDF" button
- QR code points to `/m4m/verify/{barberUserId}` — when scanned by a client, opens the verification flow

#### 4. New: `src/pages/M4MVerify.tsx`
- Route: `/m4m/verify/:barberUserId`
- When a client scans the QR code, this page:
  - Shows the barber's name + M4M heart
  - Auto-generates a session log entry and marks it verified (if client is logged in)
  - If not logged in, prompts to sign in first

#### 5. `src/App.tsx`
- Add route: `/m4m/verify/:barberUserId` → `M4MVerify`

#### 6. `src/components/barber/BarberProfileHeader.tsx`
- Pass `isOwnProfile={true}` to `M4MHeartbeat`

#### 7. `src/pages/BarberPublicProfile.tsx`
- Pass `isOwnProfile={false}` to `M4MHeartbeat`

#### 8. `src/pages/Profile.tsx`
- No changes needed (already passes M4M props)

### Technical Notes
- QR code generation uses a lightweight inline SVG QR encoder (no new dependency needed — use a simple canvas-based approach or inline the qrcode logic)
- PDF generation uses browser `window.print()` with a styled printable div (no dependency needed)
- The certification flow writes directly to `barber_profiles` via Supabase update

