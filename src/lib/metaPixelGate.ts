/**
 * Lazily initializes the Meta Pixel only when the user has given marketing consent.
 * Call `initPixelGate()` once at app startup. Subscribes to `consent-changed`.
 */
import { getConsent } from './consent';

const PIXEL_ID = '3952840548352887';
let initialized = false;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function loadPixelScript() {
  if (typeof window === 'undefined' || initialized) return;
  if (typeof window.fbq === 'function') {
    initialized = true;
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
    return;
  }
  // Inject the standard Meta Pixel base code
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  initialized = true;
  window.fbq?.('init', PIXEL_ID);
  window.fbq?.('track', 'PageView');
}

export function initPixelGate() {
  if (typeof window === 'undefined') return;
  if (getConsent().marketing) loadPixelScript();
  window.addEventListener('consent-changed', () => {
    if (getConsent().marketing) loadPixelScript();
  });
}
