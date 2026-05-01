import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Safety net for auth-email links that land on the wrong route.
 *
 * Supabase bakes the `redirectTo` into the email at send-time. Older
 * confirmation emails (sent before we wired up `authCallbackRedirect`)
 * point at the Site URL root (`https://barberhub.tv/`) instead of
 * `/auth/callback`. When those links are clicked, Supabase appends the
 * session as a URL hash like:
 *
 *   https://barberhub.tv/#access_token=...&refresh_token=...&type=signup
 *
 * The Index/ComingSoon pages don't process that hash — the SDK silently
 * consumes it, the user lands on the home screen, and the next sign-in
 * attempt fails with "Email not confirmed" because the token is spent.
 *
 * This component watches every route for a Supabase auth hash and
 * redirects to `/auth/callback` (or `/reset-password` for recovery),
 * preserving the hash so the destination page can finalize the session.
 *
 * Mounted once at the app root, inside <BrowserRouter>.
 */
export function AuthHashHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || '';
    if (!hash || hash.length < 2) return;

    // Only act on real Supabase auth hashes
    const isAuthHash =
      hash.includes('access_token=') ||
      hash.includes('error_code=') ||
      hash.includes('error_description=') ||
      hash.includes('type=signup') ||
      hash.includes('type=magiclink') ||
      hash.includes('type=invite') ||
      hash.includes('type=email_change') ||
      hash.includes('type=recovery');

    if (!isAuthHash) return;

    // Already on the right page — let that page handle it
    if (location.pathname === '/auth/callback') return;
    if (location.pathname === '/reset-password') return;

    const target = hash.includes('type=recovery')
      ? '/reset-password'
      : '/auth/callback';

    // Preserve the hash so the destination page can finalize the session
    navigate(target + hash, { replace: true });
  }, [location.pathname, navigate]);

  return null;
}
