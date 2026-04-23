/**
 * Meta Pixel + Conversions API helpers.
 * Pixel base script is loaded in index.html.
 * Server mirror runs through the `meta-capi-track` Supabase Edge Function.
 */
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export type MetaEventName = 'PageView' | 'Lead' | 'CompleteRegistration' | 'ViewContent';

interface MetaUserParams {
  email?: string;
  country?: string; // ISO-2
  user_type?: 'barber' | 'fan';
}

interface MetaTrackOptions extends MetaUserParams {
  /** Extra params merged into both pixel custom_data and CAPI custom_data */
  extra?: Record<string, unknown>;
}

/** Read a cookie by name, returns undefined if missing. */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getFbp(): string | undefined {
  return readCookie('_fbp');
}

export function getFbc(): string | undefined {
  // Prefer the cookie Meta sets after a click; otherwise build one from fbclid in URL.
  const cookie = readCookie('_fbc');
  if (cookie) return cookie;
  if (typeof window === 'undefined') return undefined;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (!fbclid) return undefined;
  return `fb.1.${Date.now()}.${fbclid}`;
}

/** Generate a UUID v4 (browser-safe). */
export function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Fire a basic PageView (used by SPA route hook). */
export function fbqTrackPageView() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', 'PageView');
}

/**
 * Fire a Meta event in the browser AND mirror it server-side through CAPI for dedup.
 * Returns the event_id used (so callers can reference it if needed).
 */
export async function fbqTrack(
  eventName: MetaEventName,
  options: MetaTrackOptions = {}
): Promise<string> {
  const event_id = newEventId();
  const { email, country, user_type, extra = {} } = options;

  const customData: Record<string, unknown> = { ...extra };
  if (user_type) customData.user_role = user_type;
  if (country) customData.country = country;

  // 1. Fire pixel (browser side) — eventID enables server dedup
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', eventName, customData, { eventID: event_id });
    }
  } catch (err) {
    console.warn('[MetaPixel] pixel track failed', err);
  }

  // 2. Mirror server-side via CAPI (non-blocking, fire-and-forget)
  try {
    const sourceUrl = typeof window !== 'undefined' ? window.location.href : undefined;
    void supabase.functions.invoke('meta-capi-track', {
      body: {
        event_name: eventName,
        event_id,
        email,
        country,
        user_type,
        source_url: sourceUrl,
        fbp: getFbp(),
        fbc: getFbc(),
      },
    });
  } catch (err) {
    console.warn('[MetaCAPI] mirror failed', err);
  }

  return event_id;
}
