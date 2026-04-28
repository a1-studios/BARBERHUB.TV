/**
 * Centralized auth redirect helpers.
 *
 * Why hardcoded? Supabase bakes the `redirectTo` / `emailRedirectTo` value
 * into the email at the moment of send. If a developer or tester triggers
 * an auth email from `localhost`, a Lovable preview, or a staging URL,
 * the link in that email points there too — even though Supabase's
 * Site URL is set to production.
 *
 * Hardcoding the production base ensures every auth email always lands
 * the user at https://barberhub.tv, regardless of where it was triggered.
 *
 * If you ever change the production domain, update this single file.
 */
export const AUTH_REDIRECT_BASE = 'https://barberhub.tv';

/** Password recovery — Supabase sends user here with a recovery token in the URL hash. */
export const passwordResetRedirect = () => `${AUTH_REDIRECT_BASE}/reset-password`;

/** Signup confirmation / magic link / email change — handled by AuthCallback page. */
export const authCallbackRedirect = () => `${AUTH_REDIRECT_BASE}/auth/callback`;

/** Post-confirmation landing (used by the gamified launch wizard). */
export const homeRedirect = () => `${AUTH_REDIRECT_BASE}/`;
