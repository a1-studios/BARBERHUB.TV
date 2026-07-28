import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my BARBER-HUB profile",
  description:
    "Return the signed-in user's BARBER-HUB profile: username, display name, country, roles (fan/barber), Barber Bucks balance, and barber profile details when they are a barber.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input: Record<string, never>, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [profileRes, rolesRes, barberRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "username, display_name, avatar_url, bio, country_code, user_type, barber_bucks, creator_level, is_creator, created_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("barber_profiles")
        .select(
          "id, name, nickname, specialty, bio, rating, years_experience, location, country_code, is_live, xp_total, xp_level, active_subscription_tier, competition_categories",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (profileRes.error) return fail(profileRes.error.message);

    const payload = {
      user_id: userId,
      email: ctx.getUserEmail() ?? null,
      profile: profileRes.data ?? null,
      roles: (rolesRes.data ?? []).map((r: { role: string }) => r.role),
      barber_profile: barberRes.data ?? null,
    };

    return ok(payload);
  },
});
