import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RoomServiceClient, EgressClient } from "npm:livekit-server-sdk@^2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Close Battle Room — pg_cron triggered
 *
 * Finds battles where ends_at <= NOW() and status = 'live'.
 * Stops egress recording, deletes LiveKit room, sets status to 'processing'.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find expired live battles
    const { data: battles, error: fetchErr } = await supabase
      .from('battles')
      .select('id, egress_id, title')
      .eq('status', 'live')
      .lte('ends_at', new Date().toISOString())
      .limit(20);

    if (fetchErr) throw fetchErr;

    if (!battles || battles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, closed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[CLOSE-BATTLE-ROOM] Found ${battles.length} expired live battles`);

    let closed = 0;

    for (const battle of battles) {
      try {
        const roomName = `battle-${battle.id}`;

        // Stop egress if active
        if (battle.egress_id && livekitUrl && livekitApiKey && livekitApiSecret) {
          try {
            const egressClient = new EgressClient(livekitUrl, livekitApiKey, livekitApiSecret);
            await egressClient.stopEgress(battle.egress_id);
            console.log(`[CLOSE-BATTLE-ROOM] Stopped egress ${battle.egress_id}`);
          } catch (egressErr) {
            console.error(`[CLOSE-BATTLE-ROOM] Egress stop error (non-fatal):`, egressErr);
          }
        }

        // Delete LiveKit room
        if (livekitUrl && livekitApiKey && livekitApiSecret) {
          try {
            const roomService = new RoomServiceClient(livekitUrl, livekitApiKey, livekitApiSecret);
            await roomService.deleteRoom(roomName);
            console.log(`[CLOSE-BATTLE-ROOM] Deleted room ${roomName}`);
          } catch (roomErr) {
            console.error(`[CLOSE-BATTLE-ROOM] Room delete error (non-fatal):`, roomErr);
          }
        }

        // Transition to processing
        await supabase
          .from('battles')
          .update({
            status: 'processing',
            barber1_is_streaming: false,
            barber2_is_streaming: false,
          })
          .eq('id', battle.id);

        closed++;
        console.log(`[CLOSE-BATTLE-ROOM] Battle ${battle.id} → processing`);
      } catch (err) {
        console.error(`[CLOSE-BATTLE-ROOM] Error closing battle ${battle.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, closed, total: battles.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[CLOSE-BATTLE-ROOM] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to close battle rooms' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
