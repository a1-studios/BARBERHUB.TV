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
      return new Response(
        JSON.stringify({ error: "LiveKit credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data: { user: authUser }, error: authError } =
      await supabaseAuth.auth.getUser(jwt);
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authUser.id;

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { battleId } = await req.json();
    if (!battleId) {
      return new Response(JSON.stringify({ error: "battleId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get barber profile
    const { data: barber, error: barberErr } = await supabaseAdmin
      .from("barber_profiles")
      .select("id, name, country_code, user_id")
      .eq("user_id", userId)
      .single();

    if (barberErr || !barber) {
      return new Response(
        JSON.stringify({ error: "Barber profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get battle
    const { data: battle, error: battleErr } = await supabaseAdmin
      .from("battles")
      .select("id, title, barber1_id, barber2_id, status, is_tournament_match")
      .eq("id", battleId)
      .single();

    if (battleErr || !battle) {
      return new Response(JSON.stringify({ error: "Battle not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isBarber1 = battle.barber1_id === barber.id;
    const isBarber2 = battle.barber2_id === barber.id;
    if (!isBarber1 && !isBarber2) {
      return new Response(
        JSON.stringify({ error: "You are not a participant in this battle" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowed = ["upcoming", "check_in", "live", "scheduled", "active"];
    if (!allowed.includes(battle.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot join battle with status: ${battle.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roomName = `battle-${battleId}`;
    const barberPosition = isBarber1 ? 1 : 2;

    // Generate LiveKit token
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: barber.id,
      ttl: "4h",
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    const token = await at.toJwt();

    // Display name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();
    const displayName = profile?.display_name || barber.name || "Barber";

    // Clean stale sessions & insert new one
    await supabaseAdmin
      .from("stream_sessions")
      .delete()
      .eq("battle_id", battleId)
      .eq("barber_id", barber.id)
      .in("status", ["connecting", "disconnected", "failed"]);

    await supabaseAdmin.from("stream_sessions").insert({
      battle_id: battleId,
      barber_id: barber.id,
      user_id: userId,
      room_name: roomName,
      status: "connecting",
      barber_position: barberPosition,
      started_at: new Date().toISOString(),
    });

    // Transition battle to live and start egress recording
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

      // Start egress recording (only triggers once — checks egress_id inside)
      try {
        const egressResponse = await fetch(
          `${supabaseUrl}/functions/v1/start-battle-egress`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ battleId, roomName }),
          }
        );
        const egressResult = await egressResponse.json();
        console.log("Egress start result:", egressResult);
      } catch (egressErr) {
        // Non-fatal: recording failure shouldn't block the battle
        console.error("Failed to start egress (non-fatal):", egressErr);
      }
    } else if (battle.status === "live") {
      await supabaseAdmin
        .from("battles")
        .update({ [`barber${barberPosition}_is_streaming`]: true })
        .eq("id", battleId);
    }

    // Award show-up point for tournament matches
    if (battle.is_tournament_match) {
      try {
        await supabaseAdmin.rpc('award_show_up_point', {
          p_barber_profile_id: barber.id,
          p_battle_id: battleId,
        });
        console.log(`Show-up point awarded to ${barber.id} for battle ${battleId}`);
      } catch (showUpErr) {
        console.error('Show-up point error (non-fatal):', showUpErr);
      }
    }

    console.log(`LiveKit token generated for barber ${barber.id} in battle ${battleId}`);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        serverUrl: livekitUrl,
        roomName,
        barberPosition,
        identity: barber.id,
        displayName,
        country: barber.country_code || null,
        battleTitle: battle.title,
        expiresIn: 14400,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Token generation error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Failed to generate token" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
