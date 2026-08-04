// Periodic sweep that:
//  1. For rows with cloudflare_stream_uid AND stream_status='pending', asks
//     Cloudflare if the asset is ready and flips status / writes thumb + duration.
//  2. For rows that are videos but have NO cloudflare_stream_uid (ingest never
//     fired or failed), re-queues them via the Copy-by-URL API.
//
// Designed to be invoked by pg_cron every minute. No JWT required — call with the
// anon key, the function uses the service role internally.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { isAuthorizedCron } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = ["creations", "creator_content", "battle_submissions"] as const;
type T = (typeof TABLES)[number];

const VIDEO_RE = /\.(mp4|mov|m4v|webm|avi)(\?|#|$)/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const cfApiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
  const cfCustomerCode = Deno.env.get("CLOUDFLARE_STREAM_CUSTOMER_CODE") || "q3djo7byzgo7v0c1";

  if (!cfAccountId || !cfApiToken) {
    return new Response(JSON.stringify({ error: "CF secrets missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Machine-invoked only: requires the shared CRON_SECRET.
  if (!isAuthorizedCron(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  const admin = createClient(supabaseUrl, serviceKey);
  const summary: Record<string, { polled: number; flipped: number; reingested: number; errors: number }> = {};

  for (const table of TABLES) {
    const s = { polled: 0, flipped: 0, reingested: 0, errors: 0 };
    summary[table] = s;

    // 1. Pending with uid → poll Cloudflare
    const { data: pendingRows } = await admin
      .from(table)
      .select("id, cloudflare_stream_uid")
      .eq("stream_status", "pending")
      .not("cloudflare_stream_uid", "is", null)
      .limit(50);

    for (const row of pendingRows ?? []) {
      s.polled++;
      try {
        const r = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${row.cloudflare_stream_uid}`,
          { headers: { Authorization: `Bearer ${cfApiToken}` } },
        );
        const j = await r.json();
        if (!j.success || !j.result) continue;
        const result = j.result as { readyToStream?: boolean; duration?: number; thumbnail?: string; status?: { state?: string } };
        if (result.readyToStream) {
          const thumb = result.thumbnail
            || `https://customer-${cfCustomerCode}.cloudflarestream.com/${row.cloudflare_stream_uid}/thumbnails/thumbnail.jpg`;
          await admin.from(table).update({
            stream_status: "ready",
            stream_ready_at: new Date().toISOString(),
            stream_thumbnail_url: thumb,
            stream_duration_seconds: result.duration ?? null,
          }).eq("id", row.id);
          s.flipped++;
        } else if (result.status?.state === "error") {
          await admin.from(table).update({ stream_status: "errored" }).eq("id", row.id);
          s.errors++;
        }
      } catch (e) {
        console.error(`[cron] poll error ${table}/${row.id}:`, e);
        s.errors++;
      }
    }

    // 2. Video rows with NO uid and not ready → re-ingest
    const mediaCol = "media_url";
    const { data: orphanRows } = await admin
      .from(table)
      .select(`id, ${mediaCol}, stream_status, created_at`)
      .is("cloudflare_stream_uid", null)
      .neq("stream_status", "ready")
      .not(mediaCol, "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    for (const row of (orphanRows ?? []) as any[]) {
      const url: string | null = row[mediaCol];
      if (!url || !VIDEO_RE.test(url)) continue;
      // skip very fresh rows (<20s) — let the original client call finish
      const age = Date.now() - new Date(row.created_at).getTime();
      if (age < 20_000) continue;
      try {
        const cf = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/copy`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${cfApiToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, meta: { name: `${table}/${row.id}` } }),
          },
        );
        const cfd = await cf.json();
        if (cfd.success && cfd.result?.uid) {
          await admin.from(table).update({
            cloudflare_stream_uid: cfd.result.uid,
            stream_status: "pending",
          }).eq("id", row.id);
          s.reingested++;
        } else {
          console.error(`[cron] reingest failed ${table}/${row.id}:`, cfd);
          s.errors++;
        }
      } catch (e) {
        console.error(`[cron] reingest error ${table}/${row.id}:`, e);
        s.errors++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
