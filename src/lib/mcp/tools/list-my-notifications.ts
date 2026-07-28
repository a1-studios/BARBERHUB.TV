import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_my_notifications",
  title: "List my notifications",
  description:
    "List the signed-in user's BARBER-HUB notifications, newest first. Optionally return only unread ones.",
  inputSchema: {
    unread_only: z.boolean().optional().describe("Only return unread notifications."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (
    input: { unread_only?: boolean; limit?: number },
    ctx: ToolContext,
  ) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("notifications")
      .select("id, type, title, message, data, read, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 20);

    if (input.unread_only) q = q.eq("read", false);

    const { data, error } = await q;
    if (error) return fail(error.message);
    return ok({ count: data?.length ?? 0, notifications: data ?? [] });
  },
});
