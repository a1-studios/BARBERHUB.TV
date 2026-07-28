import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_open_challenges",
  title: "List open challenges",
  description:
    "List BARBER-HUB open challenges — barber-vs-barber callouts with Barber Bucks stakes, pot totals and acceptance status.",
  inputSchema: {
    status: z
      .string()
      .trim()
      .max(30)
      .optional()
      .describe("Filter by challenge status, e.g. open, accepted, completed."),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (
    input: { status?: string; limit?: number },
    ctx: ToolContext,
  ) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("open_challenges")
      .select(
        "id, title, status, challenger_username, accepted_by_username, stake_amount, pot_total, bounty_amount, duration_minutes, match_mode, created_at, expires_at, battle_id",
      )
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 10);

    if (input.status) q = q.eq("status", input.status);

    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok({ count: data?.length ?? 0, challenges: data ?? [] });
  },
});
