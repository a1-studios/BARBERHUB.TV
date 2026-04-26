import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RoomServiceClient } from "npm:livekit-server-sdk@^2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DonationRequest {
  battle_id: string;
  barber_id: string;
  amount_bb: number;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { battle_id, barber_id, amount_bb, message }: DonationRequest = await req.json();
    if (!battle_id || !barber_id || !amount_bb) {
      throw new Error('Missing required fields: battle_id, barber_id, amount_bb');
    }

    console.log(`[DONATE-TO-BATTLE] Delegating to process_battle_donation RPC: ${amount_bb} BB`);

    const { data, error } = await supabase.rpc('process_battle_donation', {
      p_battle_id: battle_id,
      p_donor_id: user.id,
      p_barber_id: barber_id,
      p_amount_bb: amount_bb,
      p_message: message?.substring(0, 200) || null,
    });

    if (error) {
      console.error('[DONATE-TO-BATTLE] RPC error:', error);
      throw new Error((error as Error).message);
    }

    console.log('[DONATE-TO-BATTLE] RPC Success:', data);

    // ─── LiveKit Data Channel Broadcast (non-fatal) ───
    try {
      const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
      const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');
      const livekitUrl = Deno.env.get('LIVEKIT_URL');

      if (livekitApiKey && livekitApiSecret && livekitUrl) {
        // Get battle to find both barber IDs
        const { data: battle } = await supabase
          .from('battles')
          .select('barber1_id, barber2_id, status')
          .eq('id', battle_id)
          .single();

        if (battle && battle.status === 'live') {
          // Sum donation totals per barber for this battle
          const { data: donations } = await supabase
            .from('battle_donations')
            .select('barber_id, amount_bb')
            .eq('battle_id', battle_id);

          let total_b1 = 0;
          let total_b2 = 0;
          if (donations) {
            for (const d of donations) {
              if (d.barber_id === battle.barber1_id) total_b1 += d.amount_bb;
              else if (d.barber_id === battle.barber2_id) total_b2 += d.amount_bb;
            }
          }

          // Get donor display name
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();

          const roomName = `battle-${battle_id}`;
          const payload = JSON.stringify({
            type: 'donation',
            barber_id,
            amount: amount_bb,
            donor: profile?.display_name || 'Anonymous',
            total_b1,
            total_b2,
          });

          const roomService = new RoomServiceClient(livekitUrl, livekitApiKey, livekitApiSecret);
          await roomService.sendData(
            roomName,
            new TextEncoder().encode(payload),
            { reliable: true } as any
          );
          console.log('[DONATE-TO-BATTLE] Data Channel broadcast sent');
        }
      }
    } catch (broadcastErr) {
      // Non-fatal: donation succeeded even if broadcast fails
      console.error('[DONATE-TO-BATTLE] Data Channel broadcast failed (non-fatal):', broadcastErr);
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[DONATE-TO-BATTLE] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to process donation' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
