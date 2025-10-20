import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[AUTO-CLOSE-VOTING] Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Find all battles that are in 'voting' status and have expired voting periods
    const { data: expiredBattles, error: fetchError } = await supabaseClient
      .from('battles')
      .select('id, title, voting_ends_at, tournament_id')
      .eq('status', 'voting')
      .lt('voting_ends_at', new Date().toISOString());

    if (fetchError) {
      console.error('[AUTO-CLOSE-VOTING] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!expiredBattles || expiredBattles.length === 0) {
      console.log('[AUTO-CLOSE-VOTING] No expired battles found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired battles to close',
          processed: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[AUTO-CLOSE-VOTING] Found ${expiredBattles.length} expired battles`);

    const results = [];

    for (const battle of expiredBattles) {
      try {
        console.log(`[AUTO-CLOSE-VOTING] Processing battle: ${battle.id} - ${battle.title}`);

        // Update battle status to completed
        const { error: updateError } = await supabaseClient
          .from('battles')
          .update({ status: 'completed' })
          .eq('id', battle.id);

        if (updateError) {
          console.error(`[AUTO-CLOSE-VOTING] Update error for battle ${battle.id}:`, updateError);
          results.push({
            battleId: battle.id,
            success: false,
            error: updateError.message
          });
          continue;
        }

        // If tournament match, calculate results and update standings
        if (battle.tournament_id) {
          console.log(`[AUTO-CLOSE-VOTING] Tournament match - calculating results for ${battle.id}`);

          // Calculate match result
          const { data: result, error: resultError } = await supabaseClient
            .rpc('calculate_match_result', { battle_id_param: battle.id });

          if (resultError) {
            console.error(`[AUTO-CLOSE-VOTING] Result calculation error for battle ${battle.id}:`, resultError);
          } else {
            console.log(`[AUTO-CLOSE-VOTING] Match result calculated for ${battle.id}:`, result);
          }

          // Update tournament standings
          const { error: standingsError } = await supabaseClient
            .rpc('update_tournament_standings', { battle_id_param: battle.id });

          if (standingsError) {
            console.error(`[AUTO-CLOSE-VOTING] Standings update error for battle ${battle.id}:`, standingsError);
          } else {
            console.log(`[AUTO-CLOSE-VOTING] Tournament standings updated for ${battle.id}`);
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
              .eq('battle_id', battle.id);

            if (bracketError) {
              console.error(`[AUTO-CLOSE-VOTING] Bracket update error for battle ${battle.id}:`, bracketError);
            } else {
              console.log(`[AUTO-CLOSE-VOTING] Bracket updated for ${battle.id}`);
            }
          }
        }

        results.push({
          battleId: battle.id,
          title: battle.title,
          success: true,
          isTournamentMatch: !!battle.tournament_id
        });

        console.log(`[AUTO-CLOSE-VOTING] Successfully closed battle ${battle.id}`);
      } catch (battleError) {
        console.error(`[AUTO-CLOSE-VOTING] Error processing battle ${battle.id}:`, battleError);
        results.push({
          battleId: battle.id,
          success: false,
          error: battleError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[AUTO-CLOSE-VOTING] Completed: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiredBattles.length} expired battles`,
        processed: expiredBattles.length,
        successful: successCount,
        failed: failureCount,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[AUTO-CLOSE-VOTING] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
