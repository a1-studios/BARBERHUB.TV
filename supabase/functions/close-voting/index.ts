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

    let winnerDisplayName = null;

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
        
        // Get winner profile for notification
        if (result && result.length > 0 && result[0].winner_id) {
          const { data: winnerProfile } = await supabaseClient
            .rpc('get_public_profile', { profile_user_id: result[0].winner_id });
          
          if (winnerProfile && winnerProfile.length > 0) {
            winnerDisplayName = winnerProfile[0].display_name;
          }
        }
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

    // Send notifications to participants
    const participantsNotifyResult = await supabaseClient
      .rpc('notify_battle_participants', {
        p_battle_id: battleId,
        p_title: '🏆 Battle Results',
        p_message: `Voting has ended for "${battle.title}". ${winnerDisplayName ? `${winnerDisplayName} won!` : 'Check the results now!'}`,
        p_type: 'battle_completed',
        p_data: { winner_name: winnerDisplayName }
      });

    if (participantsNotifyResult.error) {
      console.error('[CLOSE-VOTING] Participant notification error:', participantsNotifyResult.error);
    } else {
      console.log('[CLOSE-VOTING] Notified participants');
    }

    // Send notifications to voters
    const votersNotifyResult = await supabaseClient
      .rpc('notify_battle_voters', {
        p_battle_id: battleId,
        p_title: '🎉 Battle Results Are In!',
        p_message: `The battle "${battle.title}" has ended. ${winnerDisplayName ? `${winnerDisplayName} won!` : 'See who won!'}`,
        p_type: 'battle_result',
        p_data: { winner_name: winnerDisplayName }
      });

    if (votersNotifyResult.error) {
      console.error('[CLOSE-VOTING] Voter notification error:', votersNotifyResult.error);
    } else {
      console.log('[CLOSE-VOTING] Notified voters');
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
