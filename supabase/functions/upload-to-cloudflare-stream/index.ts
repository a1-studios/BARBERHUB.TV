import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TABLES = ["battles", "battle_submissions", "creator_content", "creations"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const cfApiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

    if (!cfAccountId || !cfApiToken) {
      return new Response(
        JSON.stringify({ error: "Cloudflare Stream secrets not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate caller
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { sourceUrl, table, recordId, captionsVtt } = body as {
      sourceUrl?: string;
      table?: string;
      recordId?: string;
      captionsVtt?: string | null;
    };

    if (!sourceUrl || !table || !recordId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sourceUrl, table, recordId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
      return new Response(
        JSON.stringify({ error: `Invalid table. Must be one of: ${ALLOWED_TABLES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Cloudflare Stream "Copy via URL" API
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/copy`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: sourceUrl,
          meta: { name: `${table}/${recordId}` },
        }),
      }
    );

    const cfData = await cfResponse.json();

    if (!cfData.success || !cfData.result?.uid) {
      console.error("Cloudflare Stream error:", cfData);
      return new Response(
        JSON.stringify({ error: "Cloudflare Stream upload failed", details: cfData.errors }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const streamUid = cfData.result.uid;

    // Update the database record with the stream UID
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({ cloudflare_stream_uid: streamUid })
      .eq("id", recordId);

    if (updateError) {
      console.error("DB update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Stream uploaded but DB update failed", uid: streamUid }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ uid: streamUid, status: cfData.result.status?.state || "queued" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("upload-to-cloudflare-stream error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
