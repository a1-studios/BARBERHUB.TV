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
 * Accepts either the CRON_SECRET project secret or the `cron_secret` stored in
 * Supabase Vault (used by the pg_cron jobs, which never hold a literal value).
 * Fails closed when neither is configured.
 */
let cachedVaultSecret: string | null | undefined;

async function vaultCronSecret(): Promise<string | null> {
  if (cachedVaultSecret !== undefined) return cachedVaultSecret;
  try {
    const { data } = await serviceClient().rpc("get_cron_secret");
    cachedVaultSecret = (data as string) || null;
  } catch {
    cachedVaultSecret = null;
  }
  return cachedVaultSecret;
}

export async function isAuthorizedCron(req: Request): Promise<boolean> {
  const provided =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    "";
  if (!provided) return false;

  const envSecret = Deno.env.get("CRON_SECRET");
  if (envSecret && provided === envSecret) return true;

  const vaultSecret = await vaultCronSecret();
  return !!vaultSecret && provided === vaultSecret;
}

