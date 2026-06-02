import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Invoke an edge function with a guaranteed-valid user session.
 *
 * Why this exists:
 * - `supabase.functions.invoke` will silently fall back to the anon key
 *   when no local session exists, and the edge function then returns
 *   "Unauthorized".
 * - Worse: a stale local session can exist (in localStorage) whose
 *   server-side row was already deleted. `getSession()` returns it, the
 *   token is sent, but the auth server rejects it (`session_not_found`).
 * - This helper validates the token server-side first via `getUser()`,
 *   wipes the bad session if rejected, and only then invokes the function.
 */
export async function invokeAuthedFunction<TBody extends Record<string, unknown>, TResp = any>(
  name: string,
  body: TBody
): Promise<{ data: TResp | null; error: Error | null }> {
  // 1. Local session check
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session?.access_token) {
    toast.error("Please sign in to continue");
    return { data: null, error: new Error("Not signed in") };
  }

  // 2. Server-side validation — catches stale/revoked sessions
  const { data: userCheck, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userCheck?.user) {
    // Stale local session — purge and force re-auth
    await supabase.auth.signOut().catch(() => {});
    toast.error("Your session expired. Please sign in again.");
    return { data: null, error: new Error("Session expired") };
  }

  // 3. Invoke with explicit Bearer to avoid any SDK fallback to anon
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) return { data: null, error: error as Error };
  return { data: data as TResp, error: null };
}
