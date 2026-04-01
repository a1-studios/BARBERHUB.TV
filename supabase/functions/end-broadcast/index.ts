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

    // Find active broadcast session owned by this user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("stream_sessions")
      .select("id, barber_id, started_at")
      .eq("user_id", user.id)
      .eq("stream_type", "solo_broadcast")
      .in("status", ["connecting", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "No active broadcast found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date().toISOString();
    const durationSeconds = session.started_at
      ? Math.floor(
          (Date.now() - new Date(session.started_at).getTime()) / 1000
        )
      : 0;

    // End the session
    await supabaseAdmin
      .from("stream_sessions")
      .update({
        status: "ended",
        ended_at: now,
        duration_seconds: durationSeconds,
      })
      .eq("id", session.id);

    // Set barber offline
    if (session.barber_id) {
      await supabaseAdmin
        .from("barber_profiles")
        .update({ is_live: false, live_video_id: null })
        .eq("id", session.barber_id);
    }

    return new Response(
      JSON.stringify({ success: true, duration_seconds: durationSeconds }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[END-BROADCAST] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
