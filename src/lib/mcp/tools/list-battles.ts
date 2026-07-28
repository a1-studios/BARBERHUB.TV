import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_battles",
  title: "List battles",
  description:
    "List BARBER-HUB battles with their status, category, prize pool and schedule. Use status to narrow to live, upcoming, voting or completed battles.",
  inputSchema: {
    status: z
      .string()
      .trim()
      .max(30)
      .optional()
      .describe("Filter by battle status, e.g. live, upcoming, voting, completed."),
    category: z
      .string()
      .trim()
      .max(60)
      .optional()
      .describe("Filter by battle category."),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (
    input: { status?: string; category?: string; limit?: number },
    ctx: ToolContext,
  ) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("battles")
      .select(
        "id, title, description, category, status, prize_amount, currency, starts_at, created_at, barber1_id, barber2_id",
      )
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 10);

    if (input.status) q = q.eq("status", input.status);
    if (input.category) q = q.eq("category", input.category);

    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok({ count: data?.length ?? 0, battles: data ?? [] });
  },
});
