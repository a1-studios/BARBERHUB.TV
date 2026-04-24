/**
 * Google Ads (gtag) helpers.
 * Base gtag script is loaded in index.html, gated by VITE_GOOGLE_ADS_ID.
 * All functions no-op gracefully when the env vars are missing so dev/staging
 * doesn't fire dummy conversions.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;
const LEAD_LABEL = import.meta.env.VITE_GOOGLE_ADS_LEAD_LABEL as string | undefined;
const REGISTRATION_LABEL = import.meta.env.VITE_GOOGLE_ADS_REGISTRATION_LABEL as string | undefined;

function gtagAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function' && !!GOOGLE_ADS_ID;
}

/** Fire a Google Ads / GA4 page_view (used by the SPA hook). */
export function gtagTrackPageView(path: string) {
  if (!gtagAvailable()) return;
  try {
    window.gtag!('event', 'page_view', {
      page_path: path,
      send_to: GOOGLE_ADS_ID,
    });
  } catch (err) {
    console.warn('[GoogleAds] page_view failed', err);
  }
}

interface ConversionOptions {
  /** Conversion label (the part after the slash in send_to, e.g. "abc123"). */
  label: string;
  /** Used for dedup with Meta Pixel — pass the same UUID used for the Meta event. */
  transaction_id?: string;
  value?: number;
  currency?: string;
}

/** Generic conversion firer. */
export function gtagConversion(opts: ConversionOptions) {
  if (!gtagAvailable() || !opts.label) return;
  try {
    window.gtag!('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/${opts.label}`,
      value: opts.value,
      currency: opts.currency,
      transaction_id: opts.transaction_id,
    });
  } catch (err) {
    console.warn('[GoogleAds] conversion failed', err);
  }
}

/** Convenience: Step 1 (email captured). */
export function gtagFireLead(transaction_id?: string) {
  if (!LEAD_LABEL) return;
  gtagConversion({ label: LEAD_LABEL, transaction_id });
}

/** Convenience: Step 5 (waitlist registration completed). */
export function gtagFireRegistration(opts: { transaction_id?: string; value?: number } = {}) {
  if (!REGISTRATION_LABEL) return;
  gtagConversion({
    label: REGISTRATION_LABEL,
    transaction_id: opts.transaction_id,
    value: opts.value,
    currency: 'USD',
  });
}
