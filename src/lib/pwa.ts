// PWA service-worker registration with iframe / preview guards.
// Push notifications require an active service worker, so we register it
// in production browsers but never inside the Lovable preview iframe.

const VAPID_PUBLIC_KEY =
  "BMmpJhrZrSSVdXqDhiJMs6iz0pdQwOnlyv40ozj-MbSMKdhwshuP1gt-I8u1TDO2qGEX2h17ZUf2z2gYTX1dzTs";

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

export async function registerPWA(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (isInIframe() || isPreviewHost()) {
    // Clean up any previously-registered SW in preview to avoid stale caches.
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    return;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch (err) {
    console.warn("[PWA] registration failed", err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Subscribe the current browser to push notifications. Returns the PushSubscription JSON. */
export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  if (isInIframe() || isPreviewHost()) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing.toJSON();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  return sub.toJSON();
}

export const VAPID_PUBLIC = VAPID_PUBLIC_KEY;
