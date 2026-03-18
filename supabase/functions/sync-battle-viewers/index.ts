import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * sync-battle-viewers — Rewritten for Twilio room participant counts.
 * YouTube Data API dependency removed.
 * When AWS IVS is integrated (Phase 3), this will also query IVS GetStream for viewer counts.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all live/active battles with Twilio rooms
    const { data: battles, error } = await supabase
      .from("battles")
      .select("id, twilio_room_sid, barber1_peak_viewers, barber2_peak_viewers, live_viewers")
      .in("status", ["active", "live", "streaming"])
      .not("twilio_room_sid", "is", null);

    if (error) throw error;

    if (!battles || battles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active battles with rooms", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    let updated = 0;

    for (const battle of battles) {
      let currentViewers = 0;

      // If Twilio credentials exist, fetch participant count from Twilio REST API
      if (twilioAccountSid && twilioAuthToken && battle.twilio_room_sid) {
        try {
          const twilioUrl = `https://video.twilio.com/v1/Rooms/${battle.twilio_room_sid}/Participants?Status=connected`;
          const res = await fetch(twilioUrl, {
            headers: {
              Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            },
          });
          if (res.ok) {
            const data = await res.json();
            // Subtract 2 for the barber participants — rest are viewers
            currentViewers = Math.max(0, (data.participants?.length || 0) - 2);
          }
        } catch (e) {
          console.error(`Twilio fetch error for battle ${battle.id}:`, e);
        }
      }

      // Update viewer counts
      const peakViewers = Math.max(currentViewers, battle.barber1_peak_viewers || 0);

      const { error: updateError } = await supabase
        .from("battles")
        .update({
          live_viewers: currentViewers,
          barber1_peak_viewers: peakViewers,
          last_viewer_check: new Date().toISOString(),
        })
        .eq("id", battle.id);

      if (!updateError) updated++;
    }

    console.log(`Viewer sync: updated ${updated}/${battles.length} battles`);

    return new Response(
      JSON.stringify({ success: true, updated, total: battles.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-battle-viewers:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
