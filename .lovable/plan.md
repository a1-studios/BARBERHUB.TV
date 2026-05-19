# Media + Moderation Finalization Plan

## 1. CDN Routing (already done — verification only)

Previous turns rewrote all read paths to `https://media.barberhub.tv` and migrated existing rows. Uploads still use the direct R2 S3 endpoint. No new work — I'll do a quick grep pass to confirm no straggling `pub-*.r2.dev` references in client code.

## 2. Music Library (Hybrid, optional)

### Database (migration)
- `music_tracks` — title, artist, duration_seconds, audio_url (R2/CDN), license ('royalty_free'|'licensed'|'creative_commons'), genre, mood, bpm, is_active, uploaded_by (admin).
- RLS: public SELECT where `is_active = true`; insert/update restricted to `has_role(auth.uid(),'admin')` / sovereign.

### Frontend
- New `src/components/music/MusicSelector.tsx` — Howler.js player, search/filter by genre/mood, preview, select. Returns `{ track_id, audio_url }`.
- Wire as **optional** step into Camera Studio / battle submission / creation upload. Free-form audio uploads remain fully allowed (reactive moderation per user direction).
- Install `howler` + `@types/howler`.

## 3. DMCA & Legal

### Upload certification
- Add a required checkbox component `<DmcaCertificationCheckbox />` and embed in: `CreationUpload.tsx`, `BarberVideoSection.tsx` upload state, `CameraStudio` submission flow, `submit-battle-video` client form. Submission blocked until checked.
- Persist acknowledgement: new table `dmca_certifications` (user_id, content_type, content_id, ip_hash, user_agent, certified_at). Written via insert at upload time.

### Reporting (already partly built)
- `content_reports` table exists. Extend `target_type` to include `'creation'`, `'battle_submission'`, `'creator_content'`.
- Add `ReportButton` (already exists) to: `BrandedVideoPlayer` overlay (for battle/creation/content posts), watch feed cards, profile portfolio items.
- Add `reason = 'copyright'` to `ReportDialog` reason list (currently has harassment/IP/fraud/explicit — rename `ip_violation` label to "Copyright / DMCA" and surface a longer details field for claimant info).

### Legal pages
- New `src/pages/legal/DMCA.tsx` — full DMCA policy: takedown procedure, counter-notice, designated agent contact, repeat-infringer policy. Linked from footer and from upload certification copy.
- Update `src/pages/legal/Terms.tsx` — add "User-Generated Content & DMCA Safe Harbor" section stating BarberHub is a platform under DMCA 512(c), responds to valid takedowns, and terminates repeat infringers.
- Add `/dmca` route in `App.tsx`.

## 4. Sovereign Moderation Dashboard (`/admin/moderation`)

### Page
- New `src/pages/admin/ModerationDashboard.tsx`, wrapped in existing `AdminGuard` (uses `user_roles` + `has_role`). Sovereign-only access.
- Tabs: **Open Reports**, **Resolved**, **Strike Log**.
- Per-report row: thumbnail/preview of target media, target type, reporter, reason, details, timestamp, "Open Media" link.
- Actions per report:
  - **Dismiss** → set `content_reports.status = 'dismissed'`.
  - **Delete Content** → calls new edge function `admin-moderation-delete` which (a) deletes the DB row for the target (creation / battle_submission / creator_content), (b) deletes the underlying R2 object via S3 SDK using the stored key, (c) increments a `moderation_strikes` row for the offending creator, (d) marks report `resolved`.
  - **Terminate Account** → calls new edge function `admin-moderation-terminate` which sets `profiles.is_banned = true`, revokes sessions via `auth.admin.signOut`, and logs to `moderation_actions`.

### Database (migration)
- `moderation_strikes` (user_id, content_id, content_type, report_id, created_at, reason).
- `moderation_actions` (admin_id, target_user_id, action_type 'delete_content'|'terminate', reason, metadata, created_at) — full audit trail.
- Add `is_banned BOOLEAN DEFAULT false` + `banned_at`, `banned_reason` to `profiles`. RLS update: banned users blocked from auth-required policies (gate at edge-function / client login check).
- All tables sovereign-only via `is_sovereign()`.

### Edge functions
- `admin-moderation-delete` — verifies sovereign role from JWT, resolves the R2 key from media_url (`https://media.barberhub.tv/{key}`), deletes from R2 bucket `battles-submissions` using existing S3 client pattern (mirror `get-r2-presigned-url`), deletes DB row, writes strike + action.
- `admin-moderation-terminate` — verifies sovereign, flips `is_banned`, calls `supabase.auth.admin.signOut(user_id)`, writes action log.

### Navigation
- Add "Moderation" entry to Sovereign HQ panel index linking to `/admin/moderation`.

## Out of scope
- CDN routing (already complete).
- Building an automated Content-ID/audio fingerprint system — reactive moderation only, per user direction.
- DMCA agent registration with US Copyright Office (user must complete externally; page will list placeholder agent fields they fill in).

## Technical notes
- All BB-touching paths untouched.
- R2 deletes use the same `AWS_ACCESS_KEY_ID` / `SECRET` / `BUCKET` / `ENDPOINT` secrets already used by upload functions — no new secrets required.
- Howler.js adds ~30KB gzipped; loaded only on routes that mount `MusicSelector`.
- All migrations include RLS and audit triggers; no CHECK constraints on time-based fields.

Confirm and I'll execute migrations first, then build the UI and edge functions.