import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAuthorizedCron } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Machine-invoked only: requires the shared CRON_SECRET.
  if (!isAuthorizedCron(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  try {
    console.log('[AUTO-CLOSE-VOTING] Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: expiredBattles, error: fetchError } = await supabaseClient
      .from('battles')
      .select('id, title, voting_ends_at, tournament_id, forfeit_reason, winner_id')
      .eq('status', 'voting')
      .lt('voting_ends_at', new Date().toISOString());

    if (fetchError) {
      console.error('[AUTO-CLOSE-VOTING] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!expiredBattles || expiredBattles.length === 0) {
      console.log('[AUTO-CLOSE-VOTING] No expired battles found');
      return new Response(
        JSON.stringify({ success: true, message: 'No expired battles to close', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AUTO-CLOSE-VOTING] Found ${expiredBattles.length} expired battles`);

    const results = [];

    for (const battle of expiredBattles) {
      try {
        console.log(`[AUTO-CLOSE-VOTING] Processing battle: ${battle.id} - ${battle.title}`);

        if (battle.forfeit_reason) {
          console.log(`[AUTO-CLOSE-VOTING] Battle ${battle.id} was forfeit, skipping`);
          continue;
        }

        let winnerId: string | null = null;
        let winnerDisplayName: string | null = null;

        // Calculate match result to determine winner
        const { data: result, error: resultError } = await supabaseClient
          .rpc('calculate_match_result', { battle_id_param: battle.id });

        if (!resultError && result && result.length > 0 && result[0].winner_id) {
          winnerId = result[0].winner_id;
          
          const { data: winnerProfile } = await supabaseClient
            .rpc('get_public_profile', { profile_user_id: winnerId });
          
          if (winnerProfile && winnerProfile.length > 0) {
            winnerDisplayName = winnerProfile[0].display_name;
          }
        }

        // Update battle status to completed with winner
        const { error: updateError } = await supabaseClient
          .from('battles')
          .update({ 
            status: 'completed',
            winner_id: winnerId,
          })
          .eq('id', battle.id);

        if (updateError) {
          console.error(`[AUTO-CLOSE-VOTING] Update error for battle ${battle.id}:`, updateError);
          results.push({ battleId: battle.id, success: false, error: updateError.message });
          continue;
        }

        // Tournament standings update
        if (battle.tournament_id) {
          console.log(`[AUTO-CLOSE-VOTING] Tournament match - updating standings for ${battle.id}`);

          const { error: standingsError } = await supabaseClient
            .rpc('update_tournament_standings', { battle_id_param: battle.id });

          if (standingsError) {
            console.error(`[AUTO-CLOSE-VOTING] Standings error:`, standingsError);
          }

          if (result && result.length > 0) {
            await supabaseClient
              .from('bracket_matches')
              .update({
                winner_id: result[0].winner_id,
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('battle_id', battle.id);
          }
        }

        // 🏦 AUTO-DISTRIBUTE POT — pay out winner from challenge/donation pot
        if (winnerId) {
          try {
            // Check if there's a challenge with a pot
            const { data: challenge } = await supabaseClient
              .from('open_challenges')
              .select('id, pot_total, status')
              .eq('battle_id', battle.id)
              .eq('status', 'active')
              .maybeSingle();

            if (challenge && challenge.pot_total > 0) {
              console.log(`[AUTO-CLOSE-VOTING] Distributing challenge pot: ${challenge.pot_total} BB to winner ${winnerId}`);

              // Inline pot distribution with 5% fee (3% M4M + 2% platform)
              const potTotal = challenge.pot_total;
              const m4mFee = Math.floor(potTotal * 0.03);
              const platformFee = Math.floor(potTotal * 0.02);
              const winnerPayout = potTotal - m4mFee - platformFee;

              // Atomic payout (row-locked, records the transaction)
              const { data: payout } = await supabaseClient.rpc('adjust_barber_bucks', {
                p_user_id: winnerId,
                p_amount: winnerPayout,
                p_transaction_type: 'challenge_win',
                p_description: `Won "${battle.title}" - Pot: ${potTotal} BB`,
                p_reference_id: battle.id,
              });

              if (payout?.ok) {
                const newBalance = payout.balance as number;


                // M4M fund deposit
                if (m4mFee > 0) {
                  await supabaseClient
                    .from('m4m_fund_ledger')
                    .insert({ amount_bb: m4mFee, source_type: 'pot_distribution', reference_id: battle.id });
                }

                // Platform fee
                if (platformFee > 0) {
                  await supabaseClient
                    .from('platform_transactions')
                    .insert({
                      amount_cents: platformFee * 20,
                      transaction_type: 'challenge_fee',
                      description: `Auto-distribute from "${battle.title}"`,
                      reference_id: battle.id,
                      source_user_id: winnerId
                    });
                }

                // Notify winner
                await supabaseClient
                  .from('notifications')
                  .insert({
                    user_id: winnerId,
                    type: 'challenge_won',
                    title: '🏆 You Won!',
                    message: `You won ${winnerPayout} BB from "${battle.title}"!`,
                    data: { battle_id: battle.id, payout: winnerPayout }
                  });

                console.log(`[AUTO-CLOSE-VOTING] Pot distributed: ${winnerPayout} BB to winner`);
              }

              // Mark challenge completed
              await supabaseClient
                .from('open_challenges')
                .update({ status: 'completed', winner_id: winnerId })
                .eq('id', challenge.id);
            }
          } catch (potError) {
            console.error(`[AUTO-CLOSE-VOTING] Pot distribution error for battle ${battle.id}:`, potError);
          }
        }

        // Send notifications
        await supabaseClient.rpc('notify_battle_participants', {
          p_battle_id: battle.id,
          p_title: '🏆 Battle Results',
          p_message: `Voting has ended for "${battle.title}". ${winnerDisplayName ? `${winnerDisplayName} won!` : 'Check the results now!'}`,
          p_type: 'battle_completed',
          p_data: { winner_name: winnerDisplayName }
        });

        await supabaseClient.rpc('notify_battle_voters', {
          p_battle_id: battle.id,
          p_title: '🎉 Battle Results Are In!',
          p_message: `The battle "${battle.title}" has ended. ${winnerDisplayName ? `${winnerDisplayName} won!` : 'See who won!'}`,
          p_type: 'battle_result',
          p_data: { winner_name: winnerDisplayName }
        });

        results.push({
          battleId: battle.id,
          title: battle.title,
          success: true,
          isTournamentMatch: !!battle.tournament_id,
          winnerName: winnerDisplayName,
          potDistributed: true,
        });

        console.log(`[AUTO-CLOSE-VOTING] Successfully closed battle ${battle.id}`);
      } catch (battleError) {
        console.error(`[AUTO-CLOSE-VOTING] Error processing battle ${battle.id}:`, battleError);
        results.push({ battleId: battle.id, success: false, error: (battleError as Error).message });
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AUTO-CLOSE-VOTING] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
