import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { data: barber, error: barberError } = await supabaseAdmin
      .from("barber_profiles")
      .select("id")
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

    // Find all active or connecting broadcast sessions owned by this user
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from("stream_sessions")
      .select("id, started_at, created_at")
      .eq("user_id", user.id)
      .eq("barber_id", barber.id)
      .eq("stream_type", "solo_broadcast")
      .in("status", ["connecting", "active"])
      .order("created_at", { ascending: false });

    if (sessionError) {
      throw sessionError;
    }

    const now = new Date().toISOString();
    const latestSession = sessions?.[0];
    const referenceStartTime = latestSession?.started_at || latestSession?.created_at;
    const durationSeconds = referenceStartTime
      ? Math.floor(
          (Date.now() - new Date(referenceStartTime).getTime()) / 1000
        )
      : 0;

    if (sessions && sessions.length > 0) {
      const { error: endSessionsError } = await supabaseAdmin
        .from("stream_sessions")
        .update({
          status: "ended",
          ended_at: now,
          duration_seconds: durationSeconds,
        })
        .eq("user_id", user.id)
        .eq("barber_id", barber.id)
        .eq("stream_type", "solo_broadcast")
        .in("status", ["connecting", "active"]);

      if (endSessionsError) {
        throw endSessionsError;
      }
    }

    // Set barber offline
    const { error: barberUpdateError } = await supabaseAdmin
      .from("barber_profiles")
      .update({ is_live: false, live_video_id: null, last_live_check: now })
      .eq("id", barber.id);

    if (barberUpdateError) {
      throw barberUpdateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        duration_seconds: durationSeconds,
        sessions_ended: sessions?.length ?? 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[END-BROADCAST] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
