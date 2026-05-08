## Legal Prevention & Compliance Layer

Cyber-industrial styling throughout: dark surfaces (`bg-background/95`), brand orange primary CTAs, neon cyan outer-glow accents (`shadow-[0_0_24px_-6px_hsl(var(--cyan)/0.45)]`, `border-cyan/40`). All copyright strings = 2026.

### 1. Cookie Consent Manager

**New files**
- `src/lib/consent.ts` — typed store: `{ essential:true, analytics, functional, marketing }`, `getConsent()`, `setConsent()`, `hasDecided()`, custom `consent-changed` event. Persist to `localStorage` (`bh_consent_v1`).
- `src/components/legal/CookieConsentBanner.tsx` — compact bottom banner (mobile bottom sheet, desktop slim bar), shown only when `!hasDecided()`. Buttons: **Accept All** (orange), **Essential Only** (cyan-outline ghost), **Manage Preferences** (cyan text link → opens modal).
- `src/components/legal/CookiePreferencesModal.tsx` — shadcn `Dialog` with 4 toggle rows (Essential locked-on, Analytics, Functional, Marketing), Save / Accept All buttons. Reusable; opened from banner AND from footer "Cookie Preferences" link.

**Pixel gating**
- Strip eager `fbq('init')` / `fbq('track','PageView')` from `index.html` (keep stub script that defines `window.fbq` queue only).
- New `src/lib/metaPixelGate.ts` — `initPixelIfConsented()` calls `fbq('init', PIXEL_ID)` + initial PageView only if `marketing===true`. Subscribes to `consent-changed` to init lazily when user opts in. Also exposes `revoke()` that disables further tracks.
- `src/lib/metaPixel.ts` `fbqTrack` / `fbqTrackPageView` early-return when `getConsent().marketing !== true`.
- `useMetaPixelPageView` keeps working — it just no-ops until consent is granted.

**Mount point**: render `<CookieConsentBanner />` once inside `AppContent` (App.tsx) below `<ProfileCompletionGate />`.

### 2. Legal-gated Signup

Edit `src/components/auth/AuthDialog.tsx` (signup tab):
- Required checkbox: "I agree to Barber-Hub's [Terms of Service](/terms), [Privacy Policy](/privacy), and [Acceptable Use Policy](/aup). I confirm I am at least 18 years old." Document names hyperlinked, open in new tab.
- Optional checkbox (default off): "I'd like to receive updates, competition alerts, and Barber-Hub news by email."
- Disable **Create Account** button until required box ticked. Pass marketing-opt-in into `signUp` user metadata as `marketing_opt_in: boolean` and store `tos_accepted_at: ISO` so we have a timestamped record.

### 3. Moderation: Report action

**New files**
- `src/components/moderation/ReportButton.tsx` — small flag-icon button (lucide `Flag`), cyan hover ring. Props: `targetType: 'user'|'post'|'stream'`, `targetId: string`.
- `src/components/moderation/ReportDialog.tsx` — shadcn `Dialog` with `RadioGroup`: Harassment / IP Violation / Fraud / Explicit Content + optional details `Textarea`. Submits to existing edge-function pattern (`reports` insert via `supabase.from('content_reports').insert(...)`, table assumed/created in a follow-up; for now writes optimistically and toast-confirms — flagged as TODO if table missing).
- A tiny migration adds `public.content_reports` (id, reporter_id, target_type, target_id, reason, details, status='pending', created_at) with RLS allowing authenticated INSERT and admin SELECT.

**Inject points**
- User profiles: top-right of `BarberPublicProfile` header and `FanProfileHeader`.
- Feed posts: action bar in `WatchFeed` post card.
- LiveKit player: overlay in `BattleVideoContainer` / contender stream toolbar (top-right, alongside fullscreen).

### 4. Legal pages + footer

**New files** (all with cyber-industrial layout: max-w-3xl, dark gradient hairline cyan top border, orange section numbers, prose-invert):
- `src/pages/legal/Terms.tsx` → route `/terms`
- `src/pages/legal/Privacy.tsx` → `/privacy`
- `src/pages/legal/AUP.tsx` → `/aup`
- `src/pages/legal/Cookies.tsx` → `/cookies`
- Shared `src/components/legal/LegalLayout.tsx` (Header + Footer, container, page title, last-updated 2026-05-08).

Content is taken verbatim from the brief, formatted with `<h2>`/`<h3>` headers and `<ul>` bullet lists.

**Routes** (App.tsx): add four public routes.

**Footer** (`src/components/Footer.tsx`):
- New "Legal" column: Terms, Privacy, Acceptable Use, Cookie Policy, Cookie Preferences (button that opens the preferences modal).
- Copyright string → `© 2026 BARBER-HUB. All rights reserved.`

### Technical notes (for engineers)

- Consent store schema:
  ```ts
  type Consent = { essential: true; analytics: boolean; functional: boolean; marketing: boolean; decidedAt?: string };
  ```
- Pixel ID: keep existing `3952840548352887`, hardcoded in `metaPixelGate.ts`.
- Accessibility: banner uses `role="dialog"` + focus trap on modal; checkboxes have associated `<Label>`; report dialog `aria-describedby` on reasons.
- All new colors via existing tokens (`primary`, `cyan`, `border`, `background`, `muted-foreground`). No raw hex.

### Out of scope (not changed)

- Stripe Connect payout logic, GDPR data-export endpoints, DMCA workflow — pages only describe these; backend left untouched.
- No edits to RLS beyond the new `content_reports` table.
