/**
 * Utilities for reading attribution parameters from the URL.
 * Used to auto-fill nationality from Meta Ads (`?country=US`) and
 * to capture UTM + fbclid for downstream attribution.
 */

const ISO2 = new Set([
  'US','CA','GB','AU','DE','FR','IT','ES','NL','BE','CH','AT','SE','NO','DK','FI','IE','PT','PL','CZ',
  'HU','SK','SI','HR','RO','BG','GR','CY','MT','LU','LI','MC','SM','VA','AD','IS','JP','KR','CN','IN',
  'SG','HK','TW','MY','TH','PH','ID','VN','BD','PK','LK','NP','BT','MV','AF','IR','IQ','SA','AE','QA',
  'BH','KW','OM','YE','JO','LB','SY','IL','PS','TR','EG','LY','TN','DZ','MA','SD','SS','ET','ER','DJ',
  'SO','KE','UG','TZ','RW','BI','MG','MU','SC','KM','ZA','ZW','BW','NA','SZ','LS','ZM','MW','MZ','AO',
  'CD','CG','CF','TD','CM','GQ','GA','ST','NG','BJ','TG','GH','CI','LR','SL','GN','GW','SN','GM','CV',
  'MR','ML','BF','NE','MX','GT','BZ','SV','HN','NI','CR','PA','CU','JM','HT','DO','BS','BB','TT','GD',
  'VC','LC','DM','AG','KN','CO','VE','GY','SR','BR','PE','EC','BO','PY','UY','AR','CL','NZ','FJ','PG',
  'SB','VU','NC','PF','WS','TO','TV','KI','NR','PW','FM','MH',
]);

/** Read & validate `?country=` or `?nationality=` from URL. Persists to sessionStorage. */
export function getCountryFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('country') ?? params.get('nationality');
  if (!raw) return readStoredCountry();
  const code = raw.trim().toUpperCase();
  if (!ISO2.has(code)) return readStoredCountry();
  try {
    sessionStorage.setItem('intake_country', code);
  } catch {/* ignore */}
  return code;
}

export function readStoredCountry(): string | undefined {
  try {
    const stored = sessionStorage.getItem('intake_country');
    return stored && ISO2.has(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Read & validate `?email=` or `?em=` from URL (used by Meta/Google ad templates). Persists to sessionStorage. */
export function getEmailFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('email') ?? params.get('em');
  if (!raw) return readStoredEmail();
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 255) return readStoredEmail();
  try {
    sessionStorage.setItem('intake_email', email);
  } catch { /* ignore */ }
  return email;
}

export function readStoredEmail(): string | undefined {
  try {
    const stored = sessionStorage.getItem('intake_email');
    return stored && EMAIL_RE.test(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  fbclid?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  source_url?: string;
}

/** Read UTMs + fbclid + Google Ads click IDs from URL, persist to sessionStorage so they survive multi-step flows. */
export function captureAttribution(): AttributionData {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const data: AttributionData = {
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
    fbclid: params.get('fbclid') ?? undefined,
    gclid: params.get('gclid') ?? undefined,
    gbraid: params.get('gbraid') ?? undefined,
    wbraid: params.get('wbraid') ?? undefined,
    source_url: window.location.href,
  };
  try {
    const existing = JSON.parse(sessionStorage.getItem('intake_attribution') || '{}');
    const merged = { ...existing, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v)) };
    sessionStorage.setItem('intake_attribution', JSON.stringify(merged));
    return merged;
  } catch {
    return data;
  }
}

export function readAttribution(): AttributionData {
  try {
    return JSON.parse(sessionStorage.getItem('intake_attribution') || '{}');
  } catch {
    return {};
  }
}
