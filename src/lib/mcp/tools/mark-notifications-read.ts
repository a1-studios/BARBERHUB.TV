import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "mark_notifications_read",
  title: "Mark notifications read",
  description:
    "Mark one or more of the signed-in user's BARBER-HUB notifications as read.",
  inputSchema: {
    notification_ids: z
      .array(z.string().uuid())
      .min(1)
      .max(50)
      .describe("IDs of notifications to mark as read."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (input: { notification_ids: string[] }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", ctx.getUserId())
      .in("id", input.notification_ids)
      .select("id");

    if (error) return fail(error.message);
    return ok({ updated: data?.length ?? 0, ids: (data ?? []).map((r: { id: string }) => r.id) });
  },
});
