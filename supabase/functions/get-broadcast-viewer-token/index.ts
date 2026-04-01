import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@^2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LIVE_BROADCAST_STALE_MS = 30000;

const isFreshLiveBroadcast = (
  lastLiveCheck?: string | null,
  updatedAt?: string | null,
) => {
  const referenceTime = lastLiveCheck ?? updatedAt;

  if (!referenceTime) return false;

  return Date.now() - new Date(referenceTime).getTime() <= LIVE_BROADCAST_STALE_MS;
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

    const { roomName } = await req.json();
    if (!roomName) {
      throw new Error("roomName is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify active stream session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("stream_sessions")
      .select("id, barber_id")
      .eq("room_name", roomName)
      .eq("stream_type", "solo_broadcast")
      .in("status", ["connecting", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }

    const barberId = session?.barber_id || roomName.replace("broadcast-", "");

    const { data: barber, error: barberError } = await supabaseAdmin
      .from("barber_profiles")
      .select("id, is_live, last_live_check, updated_at")
      .eq("id", barberId)
      .maybeSingle();

    if (barberError) {
      throw barberError;
    }

    const isLive = !!barber?.is_live && isFreshLiveBroadcast(barber?.last_live_check, barber?.updated_at);

    if (!session || !isLive) {
      if (barberId) {
        const endedAt = new Date().toISOString();

        await supabaseAdmin
          .from("stream_sessions")
          .update({ status: "ended", ended_at: endedAt })
          .eq("barber_id", barberId)
          .eq("stream_type", "solo_broadcast")
          .in("status", ["connecting", "active"]);

        await supabaseAdmin
          .from("barber_profiles")
          .update({ is_live: false, live_video_id: null, last_live_check: endedAt })
          .eq("id", barberId);
      }

      return new Response(
        JSON.stringify({ error: "Stream is not currently live" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine viewer identity
    let identity = `anon-${crypto.randomUUID().slice(0, 8)}`;
    let displayName = "Viewer";

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (user) {
        identity = user.id;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", user.id)
          .single();
        displayName =
          profile?.display_name || profile?.username || "Viewer";
      }
    }

    // Subscribe-only token
    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity,
      name: displayName,
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
        identity,
        displayName,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[GET-BROADCAST-VIEWER-TOKEN] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
