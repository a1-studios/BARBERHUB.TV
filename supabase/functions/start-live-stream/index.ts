import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartStreamRequest {
  battleId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[START-STREAM] Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('[START-STREAM] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[START-STREAM] User authenticated:', user.id);

    const { battleId }: StartStreamRequest = await req.json();

    // Get battle details
    const { data: battle, error: fetchError } = await supabaseClient
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (fetchError || !battle) {
      console.error('[START-STREAM] Battle not found:', fetchError);
      throw new Error('Battle not found');
    }

    console.log('[START-STREAM] Starting stream for battle:', battleId);

    // FIX: Set status to 'active' (not 'voting') — voting begins after stream ends
    const { error: battleError } = await supabaseClient
      .from('battles')
      .update({
        status: 'active',
        starts_at: new Date().toISOString(),
      })
      .eq('id', battleId);

    if (battleError) {
      console.error('[START-STREAM] Battle update failed:', battleError);
      throw battleError;
    }

    // Update bracket match status if tournament match
    if (battle.tournament_id && battle.phase_id) {
      const { error: bracketError } = await supabaseClient
        .from('bracket_matches')
        .update({ status: 'active' })
        .eq('battle_id', battleId);

      if (bracketError) {
        console.error('[START-STREAM] Bracket update failed:', bracketError);
      }
    }

    console.log('[START-STREAM] Stream started successfully (status: active)');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Stream started successfully',
        battleId 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[START-STREAM] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
