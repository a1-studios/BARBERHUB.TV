import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateStatusRequest {
  battleId: string;
  barberPosition: 1 | 2;
  status: 'connecting' | 'live' | 'ended' | 'failed';
  viewerCount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[UPDATE-STREAM-STATUS] Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { battleId, barberPosition, status, viewerCount }: UpdateStatusRequest = await req.json();

    console.log('[UPDATE-STREAM-STATUS] Updating:', { battleId, barberPosition, status });

    // Verify barber owns this stream
    const { data: barberProfile } = await supabaseClient
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!barberProfile) {
      throw new Error('Barber profile not found');
    }

    // Get battle
    const { data: battle } = await supabaseClient
      .from('battles')
      .select('barber1_id, barber2_id')
      .eq('id', battleId)
      .single();

    if (!battle) {
      throw new Error('Battle not found');
    }

    const barberIdField = barberPosition === 1 ? 'barber1_id' : 'barber2_id';
    if (battle[barberIdField] !== barberProfile.id) {
      throw new Error('Not authorized');
    }

    // Update battle streaming status
    const battleUpdate: Record<string, any> = {};
    const isStreamingField = barberPosition === 1 ? 'barber1_is_streaming' : 'barber2_is_streaming';
    const streamStartedField = barberPosition === 1 ? 'barber1_stream_started_at' : 'barber2_stream_started_at';

    if (status === 'live') {
      battleUpdate[isStreamingField] = true;
      battleUpdate[streamStartedField] = new Date().toISOString();
      
      // If battle status is upcoming, change to voting (live)
      const { data: currentBattle } = await supabaseClient
        .from('battles')
        .select('status')
        .eq('id', battleId)
        .single();
        
      if (currentBattle?.status === 'upcoming') {
        battleUpdate.status = 'voting';
        battleUpdate.starts_at = new Date().toISOString();
      }
    } else if (status === 'ended' || status === 'failed') {
      battleUpdate[isStreamingField] = false;
    }

    if (Object.keys(battleUpdate).length > 0) {
      await supabaseClient
        .from('battles')
        .update(battleUpdate)
        .eq('id', battleId);
    }

    // Update stream session
    const sessionUpdate: Record<string, any> = { status };
    
    if (status === 'live') {
      sessionUpdate.started_at = new Date().toISOString();
    }
    
    if (viewerCount !== undefined) {
      sessionUpdate.total_views = viewerCount;
      // Update peak if current is higher
      const { data: session } = await supabaseClient
        .from('stream_sessions')
        .select('peak_viewers')
        .eq('battle_id', battleId)
        .eq('user_id', user.id)
        .single();
        
      if (session && viewerCount > (session.peak_viewers || 0)) {
        sessionUpdate.peak_viewers = viewerCount;
      }
    }

    await supabaseClient
      .from('stream_sessions')
      .update(sessionUpdate)
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .neq('status', 'ended');

    console.log('[UPDATE-STREAM-STATUS] Status updated successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[UPDATE-STREAM-STATUS] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
