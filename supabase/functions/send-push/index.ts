// Send Web Push notifications to a list of users.
// Reads push_subscriptions, signs requests with VAPID, removes dead endpoints,
// and (optionally) writes a row to notifications for in-app history.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@barberhub.tv";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const Body = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(10000),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  url: z.string().optional(),
  icon: z.string().optional(),
  tag: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  // If true, also write to public.notifications for the in-app bell
  persist_in_app: z.boolean().optional().default(true),
  type: z.string().optional().default("push"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json({ error: "VAPID keys not configured" }, 500);
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { user_ids, title, body, url, icon, tag, data, persist_in_app, type } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pull all subscriptions for the targeted users
    const { data: subs, error: subsErr } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, subscription")
      .in("user_id", user_ids);

    if (subsErr) return json({ error: subsErr.message }, 500);

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/profile",
      icon: icon || "/web-app-manifest-192x192.png",
      tag,
      data: data || {},
    });

    let sent = 0;
    let failed = 0;
    const deadIds: string[] = [];

    await Promise.all(
      (subs || []).map(async (row) => {
        try {
          await webpush.sendNotification(row.subscription as never, payload, { TTL: 60 * 60 * 24 });
          sent++;
        } catch (err) {
          // deno-lint-ignore no-explicit-any
          const status = (err as any)?.statusCode;
          if (status === 404 || status === 410) {
            deadIds.push(row.id);
          } else {
            failed++;
            console.error("[send-push] error", status, (err as Error).message);
          }
        }
      })
    );

    // Clean up dead endpoints
    if (deadIds.length) {
      await admin.from("push_subscriptions").delete().in("id", deadIds);
    }

    // Mirror into notifications table for in-app feed
    if (persist_in_app) {
      const rows = user_ids.map((uid) => ({
        user_id: uid,
        type,
        title,
        message: body,
        data: { url: url || "/profile", ...(data || {}) },
      }));
      const { error: nErr } = await admin.from("notifications").insert(rows);
      if (nErr) console.error("[send-push] notifications insert failed:", nErr.message);
    }

    return json({ sent, failed, removed: deadIds.length, targeted: subs?.length ?? 0 });
  } catch (e) {
    console.error("[send-push] fatal", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
