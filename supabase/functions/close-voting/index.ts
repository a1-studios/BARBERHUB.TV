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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
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

    // Use service role for all DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get battle details
    const { data: battle, error: fetchError } = await supabaseAdmin
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (fetchError || !battle) {
      console.error('[CLOSE-VOTING] Battle not found:', fetchError);
      throw new Error('Battle not found');
    }

    console.log('[CLOSE-VOTING] Closing voting for battle:', battleId);

    // Calculate match result
    const { data: result, error: resultError } = await supabaseAdmin
      .rpc('calculate_match_result', { battle_id_param: battleId });

    if (resultError) {
      console.error('[CLOSE-VOTING] Result calculation failed:', resultError);
    }

    const matchResult = result?.[0];
    const isDraw = matchResult?.is_draw ?? false;
    const winnerId = matchResult?.winner_id ?? null;

    // Determine loser
    let loserId: string | null = null;
    if (!isDraw && winnerId) {
      // winner_id from calculate_match_result is a user_id from barber_profiles
      // barber1_id and barber2_id are barber_profile IDs
      loserId = winnerId === battle.barber1_id ? battle.barber2_id : battle.barber1_id;
    }

    // Update battle status to completed
    const { error: battleError } = await supabaseAdmin
      .from('battles')
      .update({
        status: 'completed',
        winner_id: isDraw ? null : winnerId,
      })
      .eq('id', battleId);

    if (battleError) {
      console.error('[CLOSE-VOTING] Battle update failed:', battleError);
      throw battleError;
    }

    let winnerDisplayName: string | null = null;

    // Get winner profile for notification
    if (winnerId && !isDraw) {
      const { data: winnerProfile } = await supabaseAdmin
        .rpc('get_public_profile', { profile_user_id: winnerId });

      if (winnerProfile && winnerProfile.length > 0) {
        winnerDisplayName = winnerProfile[0].display_name;
      }
    }

    // Distribute pot with new delayed payout logic
    try {
      // Get user_ids for barber profile IDs
      let barber1UserId: string | null = null;
      let barber2UserId: string | null = null;

      if (battle.barber1_id) {
        const { data: b1 } = await supabaseAdmin
          .from('barber_profiles')
          .select('user_id')
          .eq('id', battle.barber1_id)
          .single();
        barber1UserId = b1?.user_id ?? null;
      }
      if (battle.barber2_id) {
        const { data: b2 } = await supabaseAdmin
          .from('barber_profiles')
          .select('user_id')
          .eq('id', battle.barber2_id)
          .single();
        barber2UserId = b2?.user_id ?? null;
      }

      const winnerUserId = isDraw ? barber1UserId : (winnerId === battle.barber1_id ? barber1UserId : barber2UserId);
      const loserUserId = isDraw ? barber2UserId : (winnerId === battle.barber1_id ? barber2UserId : barber1UserId);

      const distributeResponse = await fetch(
        `${supabaseUrl}/functions/v1/distribute-pot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            battle_id: battleId,
            winner_id: winnerUserId,
            loser_id: loserUserId,
            is_draw: isDraw,
          }),
        }
      );
      const distributeResult = await distributeResponse.json();
      console.log('[CLOSE-VOTING] Distribute pot result:', distributeResult);
    } catch (distErr) {
      console.error('[CLOSE-VOTING] Distribute pot error (non-fatal):', distErr);
    }

    // If tournament match, update standings and bracket
    if (battle.tournament_id) {
      console.log('[CLOSE-VOTING] Tournament match - updating standings');

      const { error: standingsError } = await supabaseAdmin
        .rpc('update_tournament_standings', { battle_id_param: battleId });

      if (standingsError) {
        console.error('[CLOSE-VOTING] Standings update failed:', standingsError);
      }

      // Finalize VOD prize split (season points)
      try {
        await supabaseAdmin.rpc('finalize_vod_prize_split', {
          p_battle_id: battleId,
          p_winner_id: winnerId,
          p_loser_id: loserId,
          p_is_draw: isDraw,
        });
      } catch (vodErr) {
        console.error('[CLOSE-VOTING] VOD prize split error:', vodErr);
      }

      // Update bracket match
      if (matchResult) {
        const { error: bracketError } = await supabaseAdmin
          .from('bracket_matches')
          .update({
            winner_id: isDraw ? null : winnerId,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('battle_id', battleId);

        if (bracketError) {
          console.error('[CLOSE-VOTING] Bracket update failed:', bracketError);
        }
      }
    }

    // Send notifications
    const resultMessage = isDraw
      ? `It's a draw! Both barbers earned payouts from "${battle.title}".`
      : `Voting has ended for "${battle.title}". ${winnerDisplayName ? `${winnerDisplayName} won!` : 'Check the results now!'}`;

    await supabaseAdmin.rpc('notify_battle_participants', {
      p_battle_id: battleId,
      p_title: isDraw ? '🤝 Battle Draw!' : '🏆 Battle Results',
      p_message: resultMessage,
      p_type: 'battle_completed',
      p_data: { winner_name: winnerDisplayName, is_draw: isDraw },
    });

    await supabaseAdmin.rpc('notify_battle_voters', {
      p_battle_id: battleId,
      p_title: isDraw ? '🤝 It\'s a Draw!' : '🎉 Battle Results Are In!',
      p_message: resultMessage,
      p_type: 'battle_result',
      p_data: { winner_name: winnerDisplayName, is_draw: isDraw },
    });

    console.log('[CLOSE-VOTING] Voting closed and results calculated');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Voting closed and results calculated',
        isTournamentMatch: !!battle.tournament_id,
        isDraw,
        winnerId: isDraw ? null : winnerId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[CLOSE-VOTING] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
