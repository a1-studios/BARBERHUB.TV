import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@^2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenRequest {
  battleId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY");
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!livekitApiKey || !livekitApiSecret || !livekitUrl) {
      return new Response(
        JSON.stringify({ error: "LiveKit credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token || token.split(".").length !== 3) {
      return new Response(
        JSON.stringify({ error: "Invalid token format. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);
    const userId = authUser?.id;

    if (authError || !userId) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { battleId }: TokenRequest = await req.json();

    if (!battleId) {
      return new Response(
        JSON.stringify({ error: "Battle ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get barber profile
    const { data: barberProfile, error: barberError } = await supabaseAdmin
      .from("barber_profiles")
      .select("id, name, country_code, user_id")
      .eq("user_id", userId)
      .single();

    if (barberError || !barberProfile) {
      return new Response(
        JSON.stringify({ error: "Barber profile not found. Only barbers can join battles." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get battle and verify participation
    const { data: battle, error: battleError } = await supabaseAdmin
      .from("battles")
      .select("id, title, barber1_id, barber2_id, status")
      .eq("id", battleId)
      .single();

    if (battleError || !battle) {
      return new Response(
        JSON.stringify({ error: "Battle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isBarber1 = battle.barber1_id === barberProfile.id;
    const isBarber2 = battle.barber2_id === barberProfile.id;

    if (!isBarber1 && !isBarber2) {
      return new Response(
        JSON.stringify({ error: "You are not a participant in this battle" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedStatuses = ["upcoming", "check_in", "live", "scheduled", "active"];
    if (!allowedStatuses.includes(battle.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot join battle with status: ${battle.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roomName = `battle-${battleId}`;
    const barberPosition = isBarber1 ? 1 : 2;

    // Generate LiveKit Access Token
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: barberProfile.id,
      ttl: "45m",
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    const jwtToken = await at.toJwt();

    // Get display name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();

    const displayName = profile?.display_name || barberProfile.name || "Barber";

    // Clean stale sessions & insert new one
    await supabaseAdmin
      .from("stream_sessions")
      .delete()
      .eq("battle_id", battleId)
      .eq("barber_id", barberProfile.id)
      .in("status", ["connecting", "disconnected", "failed"]);

    await supabaseAdmin.from("stream_sessions").insert({
      battle_id: battleId,
      barber_id: barberProfile.id,
      user_id: userId,
      room_name: roomName,
      status: "connecting",
      barber_position: barberPosition,
      started_at: new Date().toISOString(),
    });

    // Transition battle status
    const transitionStatuses = ["upcoming", "scheduled", "active", "check_in"];
    if (transitionStatuses.includes(battle.status)) {
      await supabaseAdmin
        .from("battles")
        .update({
          status: "live",
          streaming_type: "livekit",
          [`barber${barberPosition}_is_streaming`]: true,
        })
        .eq("id", battleId);
    } else if (battle.status === "live") {
      await supabaseAdmin
        .from("battles")
        .update({ [`barber${barberPosition}_is_streaming`]: true })
        .eq("id", battleId);
    }

    console.log(`LiveKit token generated for barber ${barberProfile.id} in battle ${battleId}`);

    return new Response(
      JSON.stringify({
        success: true,
        token: jwtToken,
        serverUrl: livekitUrl,
        roomName,
        barberPosition,
        identity: barberProfile.id,
        displayName,
        country: barberProfile.country_code || null,
        battleTitle: battle.title,
        expiresIn: 2700,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Token generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate battle token" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
