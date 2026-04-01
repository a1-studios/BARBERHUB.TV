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

    // Auth
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify barber profile
    const { data: barber, error: barberError } = await supabaseAdmin
      .from("barber_profiles")
      .select("id, name, active_subscription_tier, user_id")
      .eq("user_id", user.id)
      .single();

    if (barberError || !barber) {
      return new Response(
        JSON.stringify({ error: "Barber profile not found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check premium streaming flag
    const { data: flagRow } = await supabaseAdmin
      .from("platform_state")
      .select("value")
      .eq("key", "is_premium_streaming_enforced")
      .single();

    const isPremiumEnforced = flagRow?.value === "true";

    if (isPremiumEnforced && !barber.active_subscription_tier) {
      return new Response(
        JSON.stringify({
          error:
            "Live streaming is currently reserved for Premium subscribers.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const roomName = `broadcast-${barber.id}`;

    // Generate publisher token
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: user.id,
      name: barber.name || "Barber",
      ttl: "4h",
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    const token = await at.toJwt();

    // Insert stream session
    await supabaseAdmin.from("stream_sessions").insert({
      user_id: user.id,
      barber_id: barber.id,
      room_name: roomName,
      status: "connecting",
      stream_type: "solo_broadcast",
    });

    // Set barber as live
    await supabaseAdmin
      .from("barber_profiles")
      .update({ is_live: true, live_video_id: barber.id })
      .eq("id", barber.id);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        serverUrl: livekitUrl,
        roomName,
        barberId: barber.id,
        barberName: barber.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[GENERATE-BROADCAST-TOKEN] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
