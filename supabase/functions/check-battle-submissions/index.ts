import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting battle submission deadline check...');

    // Find battles past submission deadline that haven't been processed
    const { data: expiredBattles, error: fetchError } = await supabaseClient
      .from('battles')
      .select('*')
      .lt('submission_deadline', new Date().toISOString())
      .in('status', ['upcoming', 'active', 'awaiting_submissions'])
      .is('forfeit_reason', null)
      .order('submission_deadline', { ascending: true });

    if (fetchError) {
      console.error('Error fetching expired battles:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredBattles?.length || 0} battles past submission deadline`);

    let processedCount = 0;
    let forfeitedCount = 0;

    for (const battle of expiredBattles || []) {
      console.log(`Processing battle ${battle.id}: ${battle.title}`);

      const barber1Submitted = !!battle.barber_1_video_url;
      const barber2Submitted = !!battle.barber_2_video_url;

      console.log(`Barber1 submitted: ${barber1Submitted}, Barber2 submitted: ${barber2Submitted}`);

      // Scenario 1: Both submitted - let airlock mechanism handle it
      if (barber1Submitted && barber2Submitted) {
        console.log('Both barbers submitted, skipping (airlock will handle)');
        continue;
      }

      // Scenario 2: Only barber1 submitted - barber2 forfeits
      if (barber1Submitted && !barber2Submitted) {
        console.log('Barber1 wins by forfeit');
        await handleForfeit(supabaseClient, battle, battle.barber1_id, 'no_submission_barber2', battle.barber2_id);
        forfeitedCount++;
      }
      // Scenario 3: Only barber2 submitted - barber1 forfeits
      else if (!barber1Submitted && barber2Submitted) {
        console.log('Barber2 wins by forfeit');
        await handleForfeit(supabaseClient, battle, battle.barber2_id, 'no_submission_barber1', battle.barber1_id);
        forfeitedCount++;
      }
      // Scenario 4: Neither submitted - both forfeit
      else if (!barber1Submitted && !barber2Submitted) {
        console.log('Both barbers forfeit, battle cancelled');
        await handleDoubleForfeit(supabaseClient, battle);
        forfeitedCount++;
      }

      processedCount++;
    }

    console.log(`Processed ${processedCount} battles, ${forfeitedCount} forfeited`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        forfeited: forfeitedCount,
        message: `Checked ${processedCount} battles, ${forfeitedCount} forfeited`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-battle-submissions:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleForfeit(
  supabaseClient: any,
  battle: any,
  winnerId: string,
  forfeitReason: string,
  loserId: string
) {
  try {
    // Update battle status to completed with forfeit info
    const { error: battleError } = await supabaseClient
      .from('battles')
      .update({
        status: 'completed',
        forfeit_reason: forfeitReason,
        forfeit_winner_id: winnerId,
        winner_id: winnerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', battle.id);

    if (battleError) throw battleError;

    // Increment no-show count for the loser
    const { error: noShowError } = await supabaseClient.rpc('increment_no_show_count', {
      barber_user_id: loserId
    });

    if (noShowError) {
      console.error('Error incrementing no-show count:', noShowError);
    }

    // Create forfeit match result using database function
    if (battle.tournament_id) {
      const { error: resultError } = await supabaseClient.rpc('create_forfeit_match_result', {
        battle_id_param: battle.id,
        winner_id_param: winnerId,
        forfeit_reason_param: forfeitReason
      });

      if (resultError) {
        console.error('Error creating forfeit result:', resultError);
      }

      // Update tournament standings
      const { error: standingsError } = await supabaseClient.rpc('update_tournament_standings', {
        battle_id_param: battle.id
      });

      if (standingsError) {
        console.error('Error updating standings:', standingsError);
      }

      // Update bracket match if exists
      if (battle.phase_id) {
        const { error: bracketError } = await supabaseClient
          .from('bracket_matches')
          .update({
            winner_id: winnerId,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('battle_id', battle.id);

        if (bracketError) {
          console.error('Error updating bracket:', bracketError);
        }
      }
    }

    // Send notifications
    await sendForfeitNotifications(supabaseClient, battle, winnerId, loserId, forfeitReason);

  } catch (error) {
    console.error('Error handling forfeit:', error);
    throw error;
  }
}

async function handleDoubleForfeit(supabaseClient: any, battle: any) {
  try {
    // Update battle status to cancelled
    const { error: battleError } = await supabaseClient
      .from('battles')
      .update({
        status: 'cancelled',
        forfeit_reason: 'no_submission_both',
        updated_at: new Date().toISOString()
      })
      .eq('id', battle.id);

    if (battleError) throw battleError;

    // Increment no-show count for both barbers
    if (battle.barber1_id) {
      await supabaseClient.rpc('increment_no_show_count', {
        barber_user_id: battle.barber1_id
      });
    }

    if (battle.barber2_id) {
      await supabaseClient.rpc('increment_no_show_count', {
        barber_user_id: battle.barber2_id
      });
    }

    // Create forfeit match result with 0 points each
    if (battle.tournament_id) {
      const { error: resultError } = await supabaseClient.rpc('create_forfeit_match_result', {
        battle_id_param: battle.id,
        winner_id_param: null,
        forfeit_reason_param: 'no_submission_both'
      });

      if (resultError) {
        console.error('Error creating double forfeit result:', resultError);
      }

      // Update tournament standings with 0 points for both
      const { error: standingsError } = await supabaseClient.rpc('update_tournament_standings', {
        battle_id_param: battle.id
      });

      if (standingsError) {
        console.error('Error updating standings:', standingsError);
      }
    }

    // Send notifications
    await sendDoubleForfeitNotifications(supabaseClient, battle);

  } catch (error) {
    console.error('Error handling double forfeit:', error);
    throw error;
  }
}

async function sendForfeitNotifications(
  supabaseClient: any,
  battle: any,
  winnerId: string,
  loserId: string,
  forfeitReason: string
) {
  try {
    // Notify winner
    await supabaseClient.rpc('create_battle_notification', {
      p_user_id: winnerId,
      p_type: 'battle_forfeit_win',
      p_title: 'You Won by Forfeit!',
      p_message: `Your opponent didn't submit a video for "${battle.title}". You won by forfeit and earned 3 points.`,
      p_data: { battle_id: battle.id, forfeit_reason: forfeitReason }
    });

    // Notify loser
    await supabaseClient.rpc('create_battle_notification', {
      p_user_id: loserId,
      p_type: 'battle_forfeit_loss',
      p_title: 'Battle Forfeited',
      p_message: `You didn't submit a video for "${battle.title}" by the deadline. You forfeited the match.`,
      p_data: { battle_id: battle.id, forfeit_reason: forfeitReason }
    });

  } catch (error) {
    console.error('Error sending forfeit notifications:', error);
  }
}

async function sendDoubleForfeitNotifications(supabaseClient: any, battle: any) {
  try {
    const message = `Battle "${battle.title}" was cancelled because neither barber submitted a video.`;

    if (battle.barber1_id) {
      await supabaseClient.rpc('create_battle_notification', {
        p_user_id: battle.barber1_id,
        p_type: 'battle_cancelled',
        p_title: 'Battle Cancelled',
        p_message: message,
        p_data: { battle_id: battle.id, forfeit_reason: 'no_submission_both' }
      });
    }

    if (battle.barber2_id) {
      await supabaseClient.rpc('create_battle_notification', {
        p_user_id: battle.barber2_id,
        p_type: 'battle_cancelled',
        p_title: 'Battle Cancelled',
        p_message: message,
        p_data: { battle_id: battle.id, forfeit_reason: 'no_submission_both' }
      });
    }

  } catch (error) {
    console.error('Error sending double forfeit notifications:', error);
  }
}
