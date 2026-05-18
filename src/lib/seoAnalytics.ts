import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const SESSION_KEY = 'bh_seo_session';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return 'no-session';
  }
}

export interface SeoEventProps {
  city_slug?: string | null;
  service_slug?: string | null;
  [key: string]: unknown;
}

/**
 * Fire an SEO funnel event to Google Ads, Meta Pixel, and our own `seo_events`
 * table. Best-effort: failures never throw. Safe to call from render handlers.
 */
export async function trackSeoEvent(eventName: string, props: SeoEventProps = {}) {
  if (typeof window === 'undefined') return;

  const path = window.location.pathname;
  const referrer = document.referrer || null;

  // gtag (Google Ads / GA4)
  try {
    window.gtag?.('event', eventName, { ...props, page_path: path });
  } catch {
    // ignore
  }

  // Meta Pixel
  try {
    window.fbq?.('trackCustom', eventName, { ...props, page_path: path });
  } catch {
    // ignore
  }

  // First-party storage
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('seo_events').insert([{
      event_name: eventName,
      path,
      city_slug: (props.city_slug as string | null) ?? null,
      service_slug: (props.service_slug as string | null) ?? null,
      referrer,
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      props: props as Record<string, unknown>,
    }]);
  } catch {
    // ignore — analytics must never break UX
  }
}
