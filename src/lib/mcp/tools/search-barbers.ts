import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "search_barbers",
  title: "Search barbers",
  description:
    "Search the BARBER-HUB barber directory by name, nickname, specialty, city or country. Returns public barber profile details including rating, experience, location and live status.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .max(120)
      .optional()
      .describe("Free-text match against barber name, nickname or specialty."),
    country_code: z
      .string()
      .trim()
      .length(2)
      .optional()
      .describe("ISO-2 country code filter, e.g. US."),
    live_only: z
      .boolean()
      .optional()
      .describe("Only return barbers currently live streaming."),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (
    input: {
      query?: string;
      country_code?: string;
      live_only?: boolean;
      limit?: number;
    },
    ctx: ToolContext,
  ) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("barber_profiles")
      .select(
        "id, user_id, name, nickname, specialty, bio, rating, years_experience, location, shop_city, country_code, is_live, xp_level, competition_categories",
      )
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(input.limit ?? 10);

    if (input.query) {
      const term = `%${input.query.replace(/[%,]/g, "")}%`;
      q = q.or(
        `name.ilike.${term},nickname.ilike.${term},specialty.ilike.${term}`,
      );
    }
    if (input.country_code) {
      q = q.eq("country_code", input.country_code.toUpperCase());
    }
    if (input.live_only) q = q.eq("is_live", true);

    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok({ count: data?.length ?? 0, barbers: data ?? [] });
  },
});
