/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// HTML navigations: NetworkFirst so deploys are picked up quickly.
registerRoute(
  new NavigationRoute(new NetworkFirst({ cacheName: "html", networkTimeoutSeconds: 3 }), {
    denylist: [/^\/~oauth/, /^\/auth/, /^\/api/],
  })
);

// Static assets
registerRoute(
  ({ request }) => ["style", "script", "worker"].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: "assets" })
);

// Images
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// ─── Push handler ───────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload: {
    title?: string;
    body?: string;
    url?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
  } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Barber-Hub", body: event.data?.text() || "" };
  }

  const title = payload.title || "Barber-Hub";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: payload.icon || "/web-app-manifest-192x192.png",
      badge: "/web-app-manifest-192x192.png",
      tag: payload.tag,
      data: { url: payload.url || "/profile", ...(payload.data || {}) },
    })
  );
});

// ─── Notification click → focus or open app at target URL ────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string })?.url || "/profile";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          try {
            await (client as WindowClient).navigate(target);
          } catch {
            /* cross-origin; fall through */
          }
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
