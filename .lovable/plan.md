## Goal

Ship the complete PWA notification + install funnel: persistent push subscriptions, server-side fan-out via Web Push, an iOS install nudge, an opt-in toggle, and a custom service worker that handles `push` and `notificationclick` events.

## 1. Database (Supabase migration)

Create two tables (RLS-secured, owner-scoped):

- `**push_subscriptions**`
  - `id uuid pk`, `user_id uuid` (FK profiles, indexed)
  - `endpoint text unique not null` — the URL inside the subscription, used for upsert keying
  - `subscription jsonb not null` — full PushSubscription JSON (keys, endpoint, expirationTime)
  - `user_agent text`, `platform text` (ios | android | desktop)
  - `last_seen_at timestamptz`, `created_at timestamptz`
  - RLS: owner can `SELECT/INSERT/UPDATE/DELETE` rows where `user_id = auth.uid()`. Service role (edge functions) implicitly bypasses.
- We already have `notifications` (in-app feed). We will **not** duplicate it; the new edge function reads `push_subscriptions` and pushes the same payload that's also written to `notifications` so both in-app + native alerts stay in sync.

## 2. Edge function: `send-push`

`supabase/functions/send-push/index.ts`

- Auth: requires service-role caller (used from triggers / other edge functions) OR a JWT user calling for themselves (e.g. self-test). Validates with Zod.
- Body: `{ user_ids: string[], title: string, body: string, url?: string, icon?: string, tag?: string, data?: Record<string, unknown> }`
- Uses `npm:web-push@3` with `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` from `Deno.env`.
- Loads all rows in `push_subscriptions` for the given users, sends in parallel, removes any subscription returning `404/410` (Gone) so dead endpoints don't pile up.
- Returns `{ sent, failed, removed }`.

CORS via `corsHeaders` from `@supabase/supabase-js/cors`. Deploys with `verify_jwt = false` (we validate manually).

## 3. Service worker (`public/sw-push.js`)

vite-plugin-pwa's auto-generated SW handles caching; for **push** we register a separate file using `injectManifest` mode OR we extend with a small custom worker. Simplest: switch `vite-plugin-pwa` to `strategies: 'injectManifest'` with a single `src/sw.ts` that:

- Imports Workbox precache + NetworkFirst (same caching we have today).
- Adds:
  ```ts
  self.addEventListener('push', (event) => {
    const payload = event.data?.json() ?? {};
    event.waitUntil(self.registration.showNotification(payload.title || 'Barber-Hub', {
      body: payload.body,
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png',
      tag: payload.tag,
      data: { url: payload.url || '/', ...payload.data },
    }));
  });
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = event.notification.data?.url || '/appointments';
    event.waitUntil((async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) { if ('focus' in c) { c.navigate(target); return c.focus(); } }
      return self.clients.openWindow(target);
    })());
  });
  ```
- Default click target = `/appointments` (Profile → My Appointments). Override per-notification with `data.url`.

## 4. Frontend — install nudge (iOS)

New component `src/components/pwa/IOSInstallPrompt.tsx`:

- Detection: `/iphone|ipad|ipod/i.test(ua)` AND `!window.matchMedia('(display-mode: standalone)').matches` AND `!window.navigator.standalone`.
- Skip in Lovable preview / iframe (reuse guards from `pwa.ts`).
- Skip if `localStorage['bh_install_dismissed_until']` timestamp is in the future.
- Mounted globally in `App.tsx`. After 10 s timeout, opens a `Dialog` with branded copy + screenshot of Share → Add to Home Screen.
- Copy: **"Never miss a booking. Install Barber-Hub to your home screen for real-time schedule updates."**
- Buttons:
  - "Show me how" → expands a 3-step illustrated guide (Share icon → Add to Home Screen → Add).
  - "Dismiss" → sets `bh_install_dismissed_until = Date.now() + 24*3600*1000`, closes dialog.
- Android/desktop fallback: listen for `beforeinstallprompt`, stash the event, show a smaller bottom-sheet CTA on next session.

## 5. Frontend — Notification Settings toggle

New component `src/components/settings/NotificationToggle.tsx`, mounted inside Profile → Settings (next to existing controls):

- Reads current state from `navigator.serviceWorker.getRegistration().pushManager.getSubscription()`.
- ON: calls `subscribeToPush()` → upserts into `push_subscriptions` keyed on `endpoint` (so multiple devices per user are supported). Stores `user_agent`, `platform`.
- OFF: `subscription.unsubscribe()` and deletes the row by endpoint.
- Disabled state with helper text on iOS Safari **outside** standalone mode (Apple gates Web Push to installed PWAs); points users back to the install prompt.

## 6. Hardware permission persistence (camera/mic)

- Once the app is installed (standalone), Safari/Chrome treat origin permissions as durable, but our code re-prompts on every mount in some places. Adjust `src/hooks/useCameraPermission.tsx` to:
  - Use `navigator.permissions.query({ name: 'camera' })` and `'microphone'` first; only call `getUserMedia` if state is `prompt`. If `granted`, skip prompt entirely.
  - Cache last-known state in `sessionStorage` so re-mounts don't flicker.

## 7. Verification

- `bunx vitest run` on any affected hooks (no new tests required unless you want them).
- Deploy `send-push`, then call it via `supabase--curl_edge_functions` with a fabricated `user_ids` payload (target the logged-in preview user). Check that:
  - `notifications` row appears in the in-app bell.
  - Browser receives and displays the push (only on the **published** domain — not in the editor iframe).
- Lovable preview won't show the install prompt or push (iframe guard); test on `barberhub-tv.lovable.app`.

## File map

```text
supabase/migrations/<ts>_push_subscriptions.sql      new
supabase/functions/send-push/index.ts                new
public/                                              icons already in place
src/sw.ts                                            new (injectManifest)
vite.config.ts                                       switch to injectManifest, srcDir
src/lib/pwa.ts                                       no change
src/components/pwa/IOSInstallPrompt.tsx              new
src/components/settings/NotificationToggle.tsx      new
src/hooks/useCameraPermission.tsx                    edit (Permissions API)
src/App.tsx                                          mount IOSInstallPrompt globally
src/pages/Profile.tsx                                mount NotificationToggle in settings
```

## Open question

Where should `NotificationToggle` live in the UI — inside **Profile → Account settings** list, or as a standalone row at the top of the notifications bell panel? Default is Profile settings unless you say otherwise. they should be in the users profile 