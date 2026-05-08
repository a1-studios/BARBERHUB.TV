/**
 * Cookie consent store.
 * Persisted to localStorage. Emits a `consent-changed` window event when updated.
 */
export type ConsentCategories = {
  essential: true;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
};

export type ConsentState = ConsentCategories & {
  decidedAt?: string;
};

const KEY = 'bh_consent_v1';

const DEFAULT: ConsentState = {
  essential: true,
  analytics: false,
  functional: false,
  marketing: false,
};

export function getConsent(): ConsentState {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return { ...DEFAULT, ...parsed, essential: true };
  } catch {
    return DEFAULT;
  }
}

export function hasDecided(): boolean {
  return !!getConsent().decidedAt;
}

export function setConsent(next: Partial<ConsentCategories>): ConsentState {
  const merged: ConsentState = {
    ...getConsent(),
    ...next,
    essential: true,
    decidedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* ignore quota */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('consent-changed', { detail: merged }));
  }
  return merged;
}

export function acceptAll(): ConsentState {
  return setConsent({ analytics: true, functional: true, marketing: true });
}

export function essentialOnly(): ConsentState {
  return setConsent({ analytics: false, functional: false, marketing: false });
}

export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
}
