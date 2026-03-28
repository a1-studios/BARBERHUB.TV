import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EgressClient, EncodedFileOutput, S3Upload } from "npm:livekit-server-sdk@^2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const livekitUrl = Deno.env.get("LIVEKIT_URL");
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY");
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const r2Endpoint = Deno.env.get("R2_ENDPOINT");
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const r2PublicUrl = Deno.env.get("R2_PUBLIC_URL");

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return new Response(
        JSON.stringify({ error: "LiveKit credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) {
      return new Response(
        JSON.stringify({ error: "R2 storage credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { battleId, roomName } = await req.json();
    if (!battleId || !roomName) {
      return new Response(
        JSON.stringify({ error: "battleId and roomName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if egress already started for this battle
    const { data: battle } = await supabaseAdmin
      .from("battles")
      .select("egress_id")
      .eq("id", battleId)
      .single();

    if (battle?.egress_id) {
      console.log(`Egress already active for battle ${battleId}: ${battle.egress_id}`);
      return new Response(
        JSON.stringify({ success: true, egressId: battle.egress_id, alreadyRunning: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build S3-compatible output for R2
    const timestamp = Date.now();
    const outputKey = `recordings/${battleId}/${timestamp}.mp4`;

    // Create egress client — strip protocol for host
    const livekitHost = livekitUrl.replace(/^wss?:\/\//, "").replace(/^https?:\/\//, "");
    const egressClient = new EgressClient(`https://${livekitHost}`, livekitApiKey, livekitApiSecret);

    // S3Upload config for R2
    const s3Upload = new S3Upload({
      accessKey: r2AccessKeyId,
      secret: r2SecretAccessKey,
      endpoint: r2Endpoint,
      bucket: "battle-summissions",
      region: "auto",
      forcePathStyle: true,
    });

    // EncodedFileOutput for MP4
    const fileOutput = new EncodedFileOutput({
      filepath: outputKey,
      output: { case: "s3", value: s3Upload },
    });

    // Start room composite egress (records entire room as single MP4)
    const egressInfo = await egressClient.startRoomCompositeEgress(
      roomName,
      { file: fileOutput },
    );

    const egressId = egressInfo.egressId;
    console.log(`Egress started for battle ${battleId}: ${egressId}, output: ${outputKey}`);

    // Store egress ID in battles table
    await supabaseAdmin
      .from("battles")
      .update({ egress_id: egressId })
      .eq("id", battleId);

    return new Response(
      JSON.stringify({
        success: true,
        egressId,
        outputKey,
        publicUrl: r2PublicUrl ? `${r2PublicUrl}/${outputKey}` : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Egress start error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to start egress" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
