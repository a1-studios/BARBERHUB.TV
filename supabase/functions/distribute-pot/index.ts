import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Revised Pot Distribution — 2-Week Delayed Payout
 *
 * Split:
 *   68% → Category Prize Pool (immediate)
 *   15% → Platform Revenue (immediate)
 *    5% → M4M Fund (immediate)
 *   10% → Winner  (held 14 days in pending_payouts)
 *    2% → Loser   (held 14 days in pending_payouts)
 *
 * On DRAW:
 *   68% → Category Prize Pool
 *   15% → Platform
 *    5% → M4M
 *    6% → Barber A (held 14 days)
 *    6% → Barber B (held 14 days)
 */

const PRIZE_POOL_PERCENT = 68;
const PLATFORM_PERCENT = 15;
const M4M_PERCENT = 5;
const WINNER_PERCENT = 10;
const LOSER_PERCENT = 2;
const DRAW_EACH_PERCENT = 6;
const HOLD_DAYS = 14;

interface DistributeRequest {
  challenge_id?: string;
  battle_id?: string;
  winner_id?: string | null;
  loser_id?: string | null;
  is_draw?: boolean;
  /**
   * When 'quick_play', the function tallies live_challenge_votes for the battle
   * and auto-resolves winner/loser/is_draw. The pot includes the original stake
   * (battles.prize_amount) PLUS all viewer donations (battle_donations).
   */
  match_mode?: 'quick_play' | string;
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

    const body: DistributeRequest = await req.json();
    const { challenge_id, battle_id, match_mode } = body;
    let { winner_id, loser_id, is_draw } = body;

    console.log(`[DISTRIBUTE-POT] battle: ${battle_id}, challenge: ${challenge_id}, match_mode: ${match_mode}, winner: ${winner_id}, loser: ${loser_id}, draw: ${is_draw}`);

    let potTotal = 0;
    let title = '';
    let category = 'open';

    if (challenge_id) {
      const { data: challenge, error: challengeError } = await supabase
        .from('open_challenges')
        .select('*')
        .eq('id', challenge_id)
        .single();

      if (challengeError || !challenge) throw new Error('Challenge not found');
      if (challenge.status === 'completed') throw new Error('Pot already distributed');

      potTotal = challenge.pot_total || 0;
      title = challenge.title;
      category = challenge.category || 'open';

      await supabase.from('open_challenges').update({ status: 'completed' }).eq('id', challenge_id);
    } else if (battle_id) {
      const { data: battle } = await supabase
        .from('battles')
        .select('category, title, prize_amount, barber1_id, barber2_id, match_mode')
        .eq('id', battle_id)
        .single();

      category = battle?.category || 'open';
      title = battle?.title || 'Battle';

      const { data: donations } = await supabase
        .from('battle_donations')
        .select('amount_bb')
        .eq('battle_id', battle_id);

      const donationTotal = donations?.reduce((sum, d) => sum + d.amount_bb, 0) || 0;

      // For Quick Play live challenges, the pot = original stake (battles.prize_amount)
      // + viewer donations. We also auto-tally live_challenge_votes to pick the winner.
      const isQuickPlay = match_mode === 'quick_play' || battle?.match_mode === 'quick_play';

      if (isQuickPlay) {
        potTotal = (battle?.prize_amount || 0) + donationTotal;

        if (!winner_id && !is_draw) {
          const { data: liveVotes } = await supabase
            .from('live_challenge_votes')
            .select('picked_barber_id')
            .eq('battle_id', battle_id);

          const tally = new Map<string, number>();
          for (const v of liveVotes || []) {
            tally.set(v.picked_barber_id, (tally.get(v.picked_barber_id) || 0) + 1);
          }

          const b1 = battle?.barber1_id;
          const b2 = battle?.barber2_id;
          const c1 = b1 ? (tally.get(b1) || 0) : 0;
          const c2 = b2 ? (tally.get(b2) || 0) : 0;

          if (c1 === c2) {
            is_draw = true;
          } else if (c1 > c2) {
            // Resolve barber_profiles.id → user_id (winners table uses user_id)
            const { data: bp } = await supabase
              .from('barber_profiles').select('user_id').eq('id', b1).single();
            winner_id = bp?.user_id || null;
            const { data: bp2 } = await supabase
              .from('barber_profiles').select('user_id').eq('id', b2).single();
            loser_id = bp2?.user_id || null;
          } else {
            const { data: bp } = await supabase
              .from('barber_profiles').select('user_id').eq('id', b2).single();
            winner_id = bp?.user_id || null;
            const { data: bp2 } = await supabase
              .from('barber_profiles').select('user_id').eq('id', b1).single();
            loser_id = bp2?.user_id || null;
          }
          console.log(`[DISTRIBUTE-POT] quick_play tally — b1:${c1} vs b2:${c2}, winner=${winner_id}, draw=${is_draw}`);
        }
      } else {
        potTotal = donationTotal;
      }
    } else {
      throw new Error('Either challenge_id or battle_id is required');
    }

    if (potTotal <= 0) {
      // For quick_play, still wipe the ephemeral votes & mark complete even with no pot
      if (battle_id && match_mode === 'quick_play') {
        await supabase.from('live_challenge_votes').delete().eq('battle_id', battle_id);
      }
      return new Response(
        JSON.stringify({ success: true, message: 'No pot to distribute', payout: 0, winner_id, is_draw }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculate splits using integer math
    const prizePoolAmount = Math.floor(potTotal * PRIZE_POOL_PERCENT / 100);
    const platformFee = Math.floor(potTotal * PLATFORM_PERCENT / 100);
    const m4mFee = Math.floor(potTotal * M4M_PERCENT / 100);

    const releaseDate = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const refId = challenge_id || battle_id;

    let winnerPayout = 0;
    let loserPayout = 0;

    if (is_draw) {
      // Draw: 6% each
      const eachPayout = Math.floor(potTotal * DRAW_EACH_PERCENT / 100);

      if (winner_id) {
        await insertPendingPayout(supabase, winner_id, eachPayout, battle_id, challenge_id, 'battle_draw', releaseDate);
        await logPendingTransaction(supabase, winner_id, eachPayout, 'payout_pending', `Draw payout (held ${HOLD_DAYS} days) from "${title}"`, refId);
        await notifyPayout(supabase, winner_id, eachPayout, title, HOLD_DAYS);
      }
      if (loser_id) {
        await insertPendingPayout(supabase, loser_id, eachPayout, battle_id, challenge_id, 'battle_draw', releaseDate);
        await logPendingTransaction(supabase, loser_id, eachPayout, 'payout_pending', `Draw payout (held ${HOLD_DAYS} days) from "${title}"`, refId);
        await notifyPayout(supabase, loser_id, eachPayout, title, HOLD_DAYS);
      }
      winnerPayout = eachPayout;
      loserPayout = eachPayout;
    } else {
      // Win/Lose: 10% winner, 2% loser
      winnerPayout = Math.floor(potTotal * WINNER_PERCENT / 100);
      loserPayout = Math.floor(potTotal * LOSER_PERCENT / 100);

      if (winner_id && winnerPayout > 0) {
        await insertPendingPayout(supabase, winner_id, winnerPayout, battle_id, challenge_id, 'battle_winner', releaseDate);
        await logPendingTransaction(supabase, winner_id, winnerPayout, 'payout_pending', `Winner payout (held ${HOLD_DAYS} days) from "${title}"`, refId);
        await notifyPayout(supabase, winner_id, winnerPayout, title, HOLD_DAYS);
      }
      if (loser_id && loserPayout > 0) {
        await insertPendingPayout(supabase, loser_id, loserPayout, battle_id, challenge_id, 'battle_loser', releaseDate);
        await logPendingTransaction(supabase, loser_id, loserPayout, 'payout_pending', `Loser payout (held ${HOLD_DAYS} days) from "${title}"`, refId);
        await notifyPayout(supabase, loser_id, loserPayout, title, HOLD_DAYS);
      }
    }

    // Route 68% to category prize pool (immediate)
    if (prizePoolAmount > 0) {
      const poolCents = prizePoolAmount * 20;
      await supabase.from('category_prize_pools').insert({
        category,
        tournament_year: new Date().getFullYear(),
        total_pool_cents: poolCents,
        donation_contributions_cents: poolCents,
      }).then(({ error }) => {
        if (error?.code === '23505') {
          // conflict — use upsert
          return supabase.rpc('update_category_prize_pool', {
            p_category: category,
            p_donation_amount_cents: poolCents,
          });
        }
      });
    }

    // Route 15% to platform (immediate)
    if (platformFee > 0) {
      await supabase.from('platform_transactions').insert({
        amount_cents: platformFee * 20,
        transaction_type: 'battle_platform_fee',
        description: `15% platform fee from "${title}"`,
        reference_id: refId,
        source_user_id: winner_id || loser_id,
      });
    }

    // Route 5% to M4M (immediate)
    if (m4mFee > 0) {
      await supabase.from('m4m_fund_ledger').insert({
        amount_bb: m4mFee,
        source_type: 'pot_distribution',
        reference_id: refId,
      });
    }

    console.log(`[DISTRIBUTE-POT] Done: pot=${potTotal}, prize_pool=${prizePoolAmount}, platform=${platformFee}, m4m=${m4mFee}, winner=${winnerPayout}, loser=${loserPayout}, draw=${is_draw}`);

    return new Response(
      JSON.stringify({
        success: true,
        pot_total: potTotal,
        prize_pool: prizePoolAmount,
        platform_fee: platformFee,
        m4m_fee: m4mFee,
        winner_payout: winnerPayout,
        loser_payout: loserPayout,
        is_draw: !!is_draw,
        hold_days: HOLD_DAYS,
        scheduled_release: releaseDate,
        message: is_draw
          ? `${winnerPayout} BB each held for ${HOLD_DAYS} days`
          : `Winner: ${winnerPayout} BB, Loser: ${loserPayout} BB — held for ${HOLD_DAYS} days`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[DISTRIBUTE-POT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to distribute pot' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function insertPendingPayout(
  supabase: any, userId: string, amount: number,
  battleId?: string, challengeId?: string, payoutType?: string, releaseDate?: string
) {
  await supabase.from('pending_payouts').insert({
    user_id: userId,
    amount_bb: amount,
    battle_id: battleId || null,
    challenge_id: challengeId || null,
    payout_type: payoutType,
    status: 'pending',
    scheduled_release_at: releaseDate,
  });
}

async function logPendingTransaction(
  supabase: any, userId: string, amount: number,
  txType: string, description: string, refId?: string
) {
  // Get current balance for logging (don't modify it)
  const { data: profile } = await supabase
    .from('profiles')
    .select('barber_bucks')
    .eq('user_id', userId)
    .single();

  await supabase.from('barber_bucks_transactions').insert({
    user_id: userId,
    amount: 0, // Not credited yet
    balance_after: profile?.barber_bucks || 0,
    transaction_type: txType,
    description,
    reference_id: refId,
  });
}

async function notifyPayout(
  supabase: any, userId: string, amount: number, title: string, holdDays: number
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payout_pending',
    title: '💰 Payout Scheduled',
    message: `You earned ${amount} BB from "${title}". It will be released in ${holdDays} days.`,
    data: { amount_bb: amount, hold_days: holdDays },
  });
}
