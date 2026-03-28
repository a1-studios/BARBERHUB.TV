import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WebhookReceiver } from "npm:livekit-server-sdk@^2";

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
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY");
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const r2PublicUrl = Deno.env.get("R2_PUBLIC_URL");

    if (!livekitApiKey || !livekitApiSecret) {
      console.error("LiveKit credentials not configured");
      return new Response(
        JSON.stringify({ error: "LiveKit credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Read raw body for signature verification
    const rawBody = await req.text();
    const authHeader = req.headers.get("Authorization") || "";

    // Verify webhook signature
    const receiver = new WebhookReceiver(livekitApiKey, livekitApiSecret);
    let event: any;
    try {
      event = await receiver.receive(rawBody, authHeader);
    } catch (verifyError) {
      console.error("Webhook signature verification failed:", verifyError);
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received LiveKit webhook event: ${event.event}`);

    // Only handle egress_ended events
    if (event.event !== "egress_ended") {
      console.log(`Ignoring event type: ${event.event}`);
      return new Response(
        JSON.stringify({ received: true, ignored: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const egressInfo = event.egressInfo;
    if (!egressInfo) {
      console.error("No egressInfo in egress_ended event");
      return new Response(
        JSON.stringify({ error: "No egressInfo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const egressId = egressInfo.egressId;
    const roomName = egressInfo.roomName; // e.g. "battle-{battleId}"

    // Extract battleId from room name
    const battleIdMatch = roomName?.match(/^battle-(.+)$/);
    if (!battleIdMatch) {
      console.error(`Could not extract battleId from room name: ${roomName}`);
      return new Response(
        JSON.stringify({ error: "Invalid room name format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const battleId = battleIdMatch[1];

    // Extract the output file path from egress results
    let outputFilePath: string | null = null;

    // Check fileResults for the output file
    if (egressInfo.fileResults && egressInfo.fileResults.length > 0) {
      outputFilePath = egressInfo.fileResults[0].filename;
    } else if (egressInfo.file?.filename) {
      outputFilePath = egressInfo.file.filename;
    }

    if (!outputFilePath) {
      console.error("No output file found in egress result:", JSON.stringify(egressInfo));
      return new Response(
        JSON.stringify({ error: "No output file in egress result" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct public URL
    const publicUrl = r2PublicUrl
      ? `${r2PublicUrl.replace(/\/$/, "")}/${outputFilePath}`
      : outputFilePath;

    console.log(`Egress completed for battle ${battleId}. File: ${outputFilePath}, URL: ${publicUrl}`);

    // Get current battle state to determine which video URL to set
    const { data: battle, error: battleErr } = await supabaseAdmin
      .from("battles")
      .select("barber_1_video_url, barber_2_video_url, status")
      .eq("id", battleId)
      .single();

    if (battleErr || !battle) {
      console.error("Battle not found:", battleId, battleErr);
      return new Response(
        JSON.stringify({ error: "Battle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Room composite egress records the entire room — store as barber_1_video_url
    // (composite contains both barbers' streams)
    const updateData: Record<string, any> = {
      barber_1_video_url: publicUrl,
      egress_id: null, // Clear egress ID since it's completed
    };

    // If both video URLs are now present (or this is a composite), transition to voting
    const shouldTransition =
      (battle.status === "live" || battle.status === "processing") &&
      (publicUrl || battle.barber_2_video_url);

    if (shouldTransition) {
      updateData.status = "voting";
      updateData.voting_ends_at = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(); // 7 days voting window
      console.log(`Battle ${battleId} transitioning from ${battle.status} to voting`);
    }

    const { error: updateErr } = await supabaseAdmin
      .from("battles")
      .update(updateData)
      .eq("id", battleId);

    if (updateErr) {
      console.error("Failed to update battle:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update battle" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Battle ${battleId} updated with recording URL: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        battleId,
        videoUrl: publicUrl,
        transitioned: shouldTransition,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
