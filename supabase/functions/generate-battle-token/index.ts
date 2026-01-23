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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Twilio credentials
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

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the user's auth header for proper JWT validation
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Use getClaims() which works correctly with signing-keys system
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    
    if (!token || token.split(".").length !== 3) {
      console.error("Auth error: missing/invalid bearer token");
      return new Response(
        JSON.stringify({ error: "Invalid authentication token. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth claims error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      console.error("Auth error: no user ID in claims");
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${userId}`);
    
    // Create service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Parse request body
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
      // NOTE: keep this select aligned with actual DB columns
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
      console.error(`Barber ${barberProfile.id} is not a participant in battle ${battleId}`);
      return new Response(
        JSON.stringify({ error: "You are not a participant in this battle" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check battle status - allow joining for upcoming, check_in, active, or live battles
    const allowedStatuses = ["upcoming", "check_in", "live", "scheduled", "active"];
    if (!allowedStatuses.includes(battle.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot join battle with status: ${battle.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate room name
    const roomName = `battle-${battleId}`;
    const barberPosition = isBarber1 ? 1 : 2;

    // Create Twilio Access Token using official SDK
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    // Create video grant for the specific room
    const videoGrant = new VideoGrant({
      room: roomName,
    });

    // Generate token with 45-minute TTL (battle duration)
    const accessToken = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      {
        identity: barberProfile.id, // Use barber profile ID for point system tracking
        ttl: 2700, // 45 minutes in seconds
      }
    );

    accessToken.addGrant(videoGrant);

    const jwtToken = accessToken.toJwt();

    // Get user display name for room identity
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    const displayName = profile?.display_name || barberProfile.name || "Barber";

    // Log token generation for analytics
    console.log(`Token generated for barber ${barberProfile.id} (${displayName}) in battle ${battleId}`);

    // Create stream session (use insert, ignore if exists)
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
      // Log but don't block - session may already exist
      console.log("Stream session insert (may already exist):", sessionError.message);
    }

    // Update battle status to live if both barbers are joining
    if (battle.status === "upcoming" || battle.status === "scheduled") {
      await supabaseAdmin
        .from("battles")
        .update({ 
          status: "live",
          [`barber${barberPosition}_streaming`]: true,
        })
        .eq("id", battleId);
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
        expiresIn: 2700, // 45 minutes
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Token generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate battle token" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
