import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import twilio from "npm:twilio@^4.19";

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
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const apiKey = Deno.env.get("TWILIO_API_KEY");
    const apiSecret = Deno.env.get("TWILIO_API_SECRET");

    if (!accountSid || !apiKey || !apiSecret) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ error: "Streaming service not configured" }),
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
      console.error("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${userId}`);

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

    console.log(`Generating battle token for user ${userId}, battle ${battleId}`);

    // Get barber profile
    const { data: barberProfile, error: barberError } = await supabaseAdmin
      .from("barber_profiles")
      .select("id, name, country_code, user_id")
      .eq("user_id", userId)
      .single();

    if (barberError || !barberProfile) {
      console.error("Barber profile error:", barberError);
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
      console.error("Battle error:", battleError);
      return new Response(
        JSON.stringify({ error: "Battle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify barber is a participant
    const isBarber1 = battle.barber1_id === barberProfile.id;
    const isBarber2 = battle.barber2_id === barberProfile.id;

    if (!isBarber1 && !isBarber2) {
      return new Response(
        JSON.stringify({ error: "You are not a participant in this battle" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check battle status
    const allowedStatuses = ["upcoming", "check_in", "live", "scheduled", "active"];
    if (!allowedStatuses.includes(battle.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot join battle with status: ${battle.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roomName = `battle-${battleId}`;
    const barberPosition = isBarber1 ? 1 : 2;

    // --- Bug 3 Fix: Create Twilio room via REST API if it doesn't exist ---
    const twilioClient = twilio(accountSid, apiKey, { accountSid, apiSecret: undefined });
    // Use basic auth with API Key SID + API Secret for room creation
    const roomApiUrl = `https://video.twilio.com/v1/Rooms`;
    try {
      const authString = btoa(`${apiKey}:${apiSecret}`);
      // Try to fetch existing room first
      const fetchRoomRes = await fetch(`${roomApiUrl}/${encodeURIComponent(roomName)}`, {
        method: "GET",
        headers: { "Authorization": `Basic ${authString}` },
      });

      if (fetchRoomRes.status === 404) {
        // Room doesn't exist, create it
        console.log(`Creating Twilio room: ${roomName}`);
        const createRes = await fetch(roomApiUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            UniqueName: roomName,
            Type: "group",
            MaxParticipants: "2",
            MaxParticipantDuration: "2700",
            StatusCallback: `${supabaseUrl}/functions/v1/twilio-webhook`,
          }).toString(),
        });
        const createBody = await createRes.text();
        if (!createRes.ok) {
          console.error("Failed to create Twilio room:", createRes.status, createBody);
          // If room already exists (race condition), that's fine
          if (!createBody.includes("53113")) {
            console.warn("Room creation failed but continuing - may work with ad-hoc rooms");
          }
        } else {
          console.log("Twilio room created successfully");
        }
      } else if (fetchRoomRes.ok) {
        const roomData = await fetchRoomRes.json();
        console.log(`Twilio room already exists: ${roomName}, status: ${roomData.status}`);
        // If room is completed, we need a new one — but Twilio won't allow same name
        if (roomData.status === "completed") {
          console.warn("Room is completed, clients will need ad-hoc room creation");
        }
      } else {
        const body = await fetchRoomRes.text();
        console.warn("Unexpected room fetch status:", fetchRoomRes.status, body);
      }
    } catch (roomErr: any) {
      // Don't block token generation if room creation fails
      console.error("Room creation/check error (non-blocking):", roomErr.message);
    }

    // Generate Twilio Access Token
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const videoGrant = new VideoGrant({ room: roomName });

    const accessToken = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      {
        identity: barberProfile.id,
        ttl: 2700,
      }
    );

    accessToken.addGrant(videoGrant);
    const jwtToken = accessToken.toJwt();

    // Get display name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    const displayName = profile?.display_name || barberProfile.name || "Barber";

    console.log(`Token generated for barber ${barberProfile.id} (${displayName}) in battle ${battleId}`);

    // --- Bug 4 Fix: Upsert stream sessions (cleanup stale ones first) ---
    await supabaseAdmin
      .from("stream_sessions")
      .delete()
      .eq("battle_id", battleId)
      .eq("barber_id", barberProfile.id)
      .in("status", ["connecting", "disconnected", "failed"]);

    const { error: sessionError } = await supabaseAdmin
      .from("stream_sessions")
      .insert({
        battle_id: battleId,
        barber_id: barberProfile.id,
        user_id: userId,
        room_name: roomName,
        status: "connecting",
        barber_position: barberPosition,
        started_at: new Date().toISOString(),
      });

    if (sessionError) {
      console.log("Stream session insert (may already exist):", sessionError.message);
    }

    // --- Bug 1 & 2 Fix: Correct column name and expanded status gate ---
    const transitionStatuses = ["upcoming", "scheduled", "active", "check_in"];
    if (transitionStatuses.includes(battle.status)) {
      const updateData: Record<string, any> = {
        status: "live",
        [`barber${barberPosition}_is_streaming`]: true,
      };

      const { error: updateError } = await supabaseAdmin
        .from("battles")
        .update(updateData)
        .eq("id", battleId);

      if (updateError) {
        console.error("Battle status update error:", updateError.message);
      } else {
        console.log(`Battle ${battleId} transitioned to live, barber${barberPosition}_is_streaming = true`);
      }
    } else if (battle.status === "live") {
      // Battle already live, just set this barber's streaming flag
      const { error: flagError } = await supabaseAdmin
        .from("battles")
        .update({ [`barber${barberPosition}_is_streaming`]: true })
        .eq("id", battleId);

      if (flagError) {
        console.error("Streaming flag update error:", flagError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: jwtToken,
        roomName: roomName,
        barberPosition: barberPosition,
        identity: barberProfile.id,
        displayName: displayName,
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
