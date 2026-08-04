import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RoomServiceClient } from "npm:livekit-server-sdk@^2";
import { isAuthorizedCron } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * sync-battle-viewers — Uses LiveKit RoomServiceClient to get participant counts.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Machine-invoked only: requires the shared CRON_SECRET.
  if (!(await isAuthorizedCron(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: battles, error } = await supabase
      .from("battles")
      .select("id, barber1_peak_viewers, barber2_peak_viewers, live_viewers")
      .in("status", ["active", "live", "streaming"])
      .eq("streaming_type", "livekit");

    if (error) throw error;

    if (!battles || battles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active LiveKit battles", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const livekitUrl = Deno.env.get("LIVEKIT_URL");
    const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY");
    const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET");

    let updated = 0;

    for (const battle of battles) {
      let currentViewers = 0;

      if (livekitUrl && livekitApiKey && livekitApiSecret) {
        try {
          // Convert wss:// to https:// for REST API
          const httpUrl = livekitUrl.replace("wss://", "https://");
          const svc = new RoomServiceClient(httpUrl, livekitApiKey, livekitApiSecret);
          const roomName = `battle-${battle.id}`;
          const participants = await svc.listParticipants(roomName);
          // Subtract 2 barber participants — rest are viewers
          currentViewers = Math.max(0, participants.length - 2);
        } catch (e: any) {
          // Room may not exist — that's fine
          if (!e.message?.includes("not found")) {
            console.error(`LiveKit fetch error for battle ${battle.id}:`, e);
          }
        }
      }

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
  } catch (error: any) {
    console.error("Error in sync-battle-viewers:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
