import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

/**
 * Google One Tap — frictionless one-click signup.
 *
 * When the visitor has an active Google session in their browser, Google
 * surfaces a small chip suggesting their account. One tap signs them in
 * via Supabase using `signInWithIdToken` — no redirect, no email required.
 *
 * Falls back silently when:
 *   - VITE_GOOGLE_CLIENT_ID is not set
 *   - the user is already signed in
 *   - the browser blocks One Tap (Safari ITP, incognito, no Google session)
 *
 * In those cases the existing OAuth buttons in StepClaimAccount remain.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (cb?: (notif: unknown) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const loadScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('gsi load failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('gsi load failed'));
    document.head.appendChild(s);
  });

const generateNonce = async (): Promise<{ nonce: string; hashed: string }> => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const enc = new TextEncoder().encode(nonce);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const hashed = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { nonce, hashed };
};

export const GoogleOneTap = () => {
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    let cancelled = false;

    (async () => {
      // Skip if already signed in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;
      if (cancelled) return;

      try {
        await loadScript();
      } catch {
        return;
      }
      if (cancelled || !window.google?.accounts?.id) return;

      const { nonce, hashed } = await generateNonce();
      if (cancelled) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential?: string }) => {
          if (!resp.credential) return;
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: resp.credential,
            nonce,
          });
          if (error || !data.session) {
            console.error('[GoogleOneTap] signInWithIdToken failed', error);
            return;
          }

          // Auto-register lead so One Tap users still get a marketing_leads row.
          const email = data.session.user.email;
          if (email) {
            try {
              await supabase.functions.invoke('register-lead', {
                body: {
                  email,
                  fingerprint: getDeviceFingerprint(),
                  source_url: window.location.href,
                },
              });
            } catch { /* non-fatal */ }
          }

          // If a raffle ticket was claimed earlier in this session, link it.
          // Otherwise, claim one server-side so One Tap users reach raffle parity with email signups.
          try {
            const raw = localStorage.getItem('raffle_pending_claim');
            if (raw) {
              const claim = JSON.parse(raw);
              if (claim?.ticketCode) {
                await supabase.functions.invoke('link-raffle-to-user', {
                  body: { ticket_code: claim.ticketCode, user_id: data.session.user.id },
                });
              }
              localStorage.removeItem('raffle_pending_claim');
            } else if (email) {
              const { data: claimRes } = await supabase.functions.invoke('claim-raffle-ticket', {
                body: { email, fingerprint: getDeviceFingerprint() },
              });
              const ticketCode = (claimRes as any)?.ticket_code;
              if (ticketCode) {
                await supabase.functions.invoke('link-raffle-to-user', {
                  body: { ticket_code: ticketCode, user_id: data.session.user.id },
                });
                // Surface a celebration so One Tap users see their ticket like email users do.
                try {
                  sessionStorage.setItem('one_tap_raffle_reveal', JSON.stringify({
                    ticketCode,
                    tierColor: (claimRes as any)?.tier_color ?? 'white',
                  }));
                } catch { /* ignore */ }
              }
            }
          } catch { /* ignore */ }
        },
        nonce: hashed,
        use_fedcm_for_prompt: true,
        auto_select: false,
        cancel_on_tap_outside: false,
      });

      window.google.accounts.id.prompt();
      initialised.current = true;
    })();

    return () => {
      cancelled = true;
      try { window.google?.accounts?.id?.cancel?.(); } catch { /* */ }
    };
  }, []);

  return null;
};

export default GoogleOneTap;
