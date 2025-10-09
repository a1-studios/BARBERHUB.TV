import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CloseVotingRequest {
  battleId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CLOSE-VOTING] Function started');

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
      console.error('[CLOSE-VOTING] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CLOSE-VOTING] User authenticated:', user.id);

    const { battleId }: CloseVotingRequest = await req.json();

    // Get battle details
    const { data: battle, error: fetchError } = await supabaseClient
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (fetchError || !battle) {
      console.error('[CLOSE-VOTING] Battle not found:', fetchError);
      throw new Error('Battle not found');
    }

    console.log('[CLOSE-VOTING] Closing voting for battle:', battleId);

    // Update battle status to completed
    const { error: battleError } = await supabaseClient
      .from('battles')
      .update({ status: 'completed' })
      .eq('id', battleId);

    if (battleError) {
      console.error('[CLOSE-VOTING] Battle update failed:', battleError);
      throw battleError;
    }

    // If tournament match, trigger standings update
    if (battle.tournament_id) {
      console.log('[CLOSE-VOTING] Tournament match - calculating results');

      // Calculate match result using the database function
      const { data: result, error: resultError } = await supabaseClient
        .rpc('calculate_match_result', { battle_id_param: battleId });

      if (resultError) {
        console.error('[CLOSE-VOTING] Result calculation failed:', resultError);
      } else {
        console.log('[CLOSE-VOTING] Match result:', result);
      }

      // Update tournament standings
      const { error: standingsError } = await supabaseClient
        .rpc('update_tournament_standings', { battle_id_param: battleId });

      if (standingsError) {
        console.error('[CLOSE-VOTING] Standings update failed:', standingsError);
      } else {
        console.log('[CLOSE-VOTING] Tournament standings updated');
      }

      // Update bracket match
      if (result && result.length > 0) {
        const matchResult = result[0];
        const { error: bracketError } = await supabaseClient
          .from('bracket_matches')
          .update({
            winner_id: matchResult.winner_id,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('battle_id', battleId);

        if (bracketError) {
          console.error('[CLOSE-VOTING] Bracket update failed:', bracketError);
        } else {
          console.log('[CLOSE-VOTING] Bracket updated with winner:', matchResult.winner_id);
        }
      }
    }

    console.log('[CLOSE-VOTING] Voting closed and results calculated');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Voting closed and results calculated',
        isTournamentMatch: !!battle.tournament_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[CLOSE-VOTING] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
