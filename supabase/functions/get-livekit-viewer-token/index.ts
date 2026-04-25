import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@^2";

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
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!livekitApiKey || !livekitApiSecret || !livekitUrl) {
      throw new Error("LiveKit credentials not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } =
      await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { battleId, roomName } = await req.json();
    if (!battleId || !roomName) {
      throw new Error("battleId and roomName are required");
    }

    // Verify battle
    const { data: battle, error: battleError } = await supabaseClient
      .from("battles")
      .select("id, status, streaming_type")
      .eq("id", battleId)
      .single();

    if (battleError || !battle) throw new Error("Battle not found");
    // LiveKit is the platform standard. Accept legacy/null streaming_type values too.
    // Only reject if the battle is explicitly marked for a non-LiveKit pipeline (e.g., 'youtube').
    if (battle.streaming_type && !['livekit', 'twilio'].includes(battle.streaming_type)) {
      throw new Error(`This battle uses ${battle.streaming_type} streaming, not LiveKit`);
    }

    // Display name
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", user.id)
      .single();
    const displayName =
      profile?.display_name || profile?.username || "Viewer";

    // Subscribe-only token
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: user.id,
      ttl: "4h",
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: false,
      canSubscribe: true,
    });
    const token = await at.toJwt();

    return new Response(
      JSON.stringify({
        success: true,
        token,
        serverUrl: livekitUrl,
        roomName,
        identity: user.id,
        displayName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[GET-LIVEKIT-VIEWER-TOKEN] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
