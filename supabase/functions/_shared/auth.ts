import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Service-role client for privileged backend work. Never expose to the browser. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Verifies the caller's JWT and returns their user id.
 * Returns null when the request carries no valid session.
 */
export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

/** True when the caller has the given role in `user_roles`. */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const { data } = await serviceClient()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  return !!data;
}

/**
 * Guard for scheduled / machine-invoked functions.
 * The caller must present the shared CRON_SECRET. If the secret is not
 * configured the guard fails closed.
 */
export function isAuthorizedCron(req: Request): boolean {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) return false;
  const provided =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    "";
  return provided === expected;
}
