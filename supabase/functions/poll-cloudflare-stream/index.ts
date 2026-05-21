import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TABLES = ["creations", "creator_content", "battle_submissions"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const cfApiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
    const cfCustomerCode = Deno.env.get("CLOUDFLARE_STREAM_CUSTOMER_CODE") || "q3djo7byzgo7v0c1";

    if (!cfAccountId || !cfApiToken) {
      return new Response(JSON.stringify({ error: "Cloudflare Stream secrets not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { table, recordId, streamUid } = body as {
      table?: string; recordId?: string; streamUid?: string;
    };

    if (!table || !recordId || !streamUid) {
      return new Response(JSON.stringify({ error: "table, recordId, streamUid required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
      return new Response(JSON.stringify({ error: "Invalid table" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask Cloudflare for the current state
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${streamUid}`,
      { headers: { Authorization: `Bearer ${cfApiToken}` } },
    );
    const cfData = await cfRes.json();

    if (!cfData.success || !cfData.result) {
      console.error("[poll-cloudflare-stream] CF error:", cfData);
      return new Response(JSON.stringify({ status: "pending", error: "cf-fetch-failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = cfData.result as {
      readyToStream?: boolean;
      duration?: number;
      status?: { state?: string; pctComplete?: string | number };
      thumbnail?: string;
    };

    const state = result.status?.state || "queued";
    const pct = typeof result.status?.pctComplete === "string"
      ? parseFloat(result.status.pctComplete)
      : (result.status?.pctComplete as number | undefined);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (result.readyToStream) {
      const thumbnail = result.thumbnail
        || `https://customer-${cfCustomerCode}.cloudflarestream.com/${streamUid}/thumbnails/thumbnail.jpg`;

      const { error: updateErr } = await supabaseAdmin
        .from(table)
        .update({
          stream_status: "ready",
          stream_ready_at: new Date().toISOString(),
          stream_thumbnail_url: thumbnail,
          stream_duration_seconds: result.duration ?? null,
        })
        .eq("id", recordId);
      if (updateErr) console.error("[poll-cloudflare-stream] update error:", updateErr);

      return new Response(JSON.stringify({
        status: "ready",
        thumbnail,
        duration: result.duration ?? null,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (state === "error") {
      await supabaseAdmin
        .from(table)
        .update({ stream_status: "errored" })
        .eq("id", recordId);
      return new Response(JSON.stringify({ status: "errored", state }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "pending", state, progress: pct ?? null }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("poll-cloudflare-stream error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
