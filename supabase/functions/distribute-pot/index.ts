import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 5% fee: 3% M4M + 2% BarberHub platform
const M4M_FEE_PERCENT = 3;
const PLATFORM_FEE_PERCENT = 2;

const OFFICIAL_CATEGORIES = ['fades', 'designs', 'traditional', 'freestyle', 'color'];

interface DistributeRequest {
  challenge_id?: string;
  battle_id?: string;
  winner_id: string;
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
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { challenge_id, battle_id, winner_id }: DistributeRequest = await req.json();

    console.log(`[DISTRIBUTE-POT] challenge: ${challenge_id}, battle: ${battle_id}, winner: ${winner_id}`);

    if (!winner_id) {
      throw new Error('Winner ID is required');
    }

    let potTotal = 0;
    let title = '';
    let category = 'open';

    if (challenge_id) {
      const { data: challenge, error: challengeError } = await supabase
        .from('open_challenges')
        .select('*')
        .eq('id', challenge_id)
        .single();

      if (challengeError || !challenge) {
        throw new Error('Challenge not found');
      }

      if (challenge.status === 'completed') {
        throw new Error('Pot already distributed');
      }

      potTotal = challenge.pot_total || 0;
      title = challenge.title;
      category = challenge.category || 'open';

      await supabase
        .from('open_challenges')
        .update({ status: 'completed' })
        .eq('id', challenge_id);
    } else if (battle_id) {
      const { data: battle } = await supabase
        .from('battles')
        .select('category, title')
        .eq('id', battle_id)
        .single();

      category = battle?.category || 'open';
      title = battle?.title || 'Battle';

      const { data: donations } = await supabase
        .from('battle_donations')
        .select('amount_bb')
        .eq('battle_id', battle_id);
      
      potTotal = donations?.reduce((sum, d) => sum + d.amount_bb, 0) || 0;
    } else {
      throw new Error('Either challenge_id or battle_id is required');
    }

    if (potTotal <= 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pot to distribute', payout: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const isOfficialCategory = OFFICIAL_CATEGORIES.includes(category.toLowerCase());

    let m4mFee: number;
    let platformFee: number;
    let winnerPayout: number;
    let categoryPoolAmount = 0;

    if (isOfficialCategory) {
      // Official categories: 80/15/5 split
      // 80% stays in category pool (already accumulated via process_battle_donation)
      // The pot here is from challenge stakes, not donations — apply 5% fee only
      m4mFee = Math.floor(potTotal * (M4M_FEE_PERCENT / 100));
      platformFee = Math.floor(potTotal * (PLATFORM_FEE_PERCENT / 100));
      winnerPayout = potTotal - m4mFee - platformFee;
    } else {
      // Non-official: flat 5% fee (3% M4M + 2% platform)
      m4mFee = Math.floor(potTotal * (M4M_FEE_PERCENT / 100));
      platformFee = Math.floor(potTotal * (PLATFORM_FEE_PERCENT / 100));
      winnerPayout = potTotal - m4mFee - platformFee;
    }

    // Get winner's current balance
    const { data: winnerProfile, error: winnerError } = await supabase
      .from('profiles')
      .select('barber_bucks, display_name')
      .eq('user_id', winner_id)
      .single();

    if (winnerError || !winnerProfile) {
      throw new Error('Winner profile not found');
    }

    const currentBalance = winnerProfile.barber_bucks || 0;
    const newBalance = currentBalance + winnerPayout;

    // Credit winner
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance })
      .eq('user_id', winner_id);

    if (creditError) {
      throw new Error('Failed to credit winner');
    }

    // Record winner transaction
    await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id: winner_id,
        amount: winnerPayout,
        balance_after: newBalance,
        transaction_type: 'challenge_win',
        description: `Won "${title}" - Pot: ${potTotal} BB, Fees: ${m4mFee + platformFee} BB`,
        reference_id: challenge_id || battle_id
      });

    // Route M4M fee to fund ledger (3%)
    if (m4mFee > 0) {
      await supabase
        .from('m4m_fund_ledger')
        .insert({
          amount_bb: m4mFee,
          source_type: 'pot_distribution',
          reference_id: challenge_id || battle_id,
        });
    }

    // Record platform fee (2%)
    if (platformFee > 0) {
      await supabase
        .from('platform_transactions')
        .insert({
          amount_cents: platformFee * 20,
          transaction_type: 'challenge_fee',
          description: `2% platform fee from "${title}"`,
          reference_id: challenge_id || battle_id,
          source_user_id: winner_id
        });
    }

    // Notify winner
    await supabase
      .from('notifications')
      .insert({
        user_id: winner_id,
        type: 'challenge_won',
        title: '🏆 You Won!',
        message: `Congratulations! You won ${winnerPayout} BB from "${title}"!`,
        data: {
          challenge_id,
          battle_id,
          payout: winnerPayout,
          m4m_fee: m4mFee,
          platform_fee: platformFee
        }
      });

    console.log(`[DISTRIBUTE-POT] Done: ${winnerPayout} BB winner, ${m4mFee} BB M4M, ${platformFee} BB platform`);

    return new Response(
      JSON.stringify({
        success: true,
        pot_total: potTotal,
        m4m_fee: m4mFee,
        platform_fee: platformFee,
        winner_payout: winnerPayout,
        winner_new_balance: newBalance,
        message: `${winnerPayout} BB awarded to winner!`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[DISTRIBUTE-POT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to distribute pot' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
