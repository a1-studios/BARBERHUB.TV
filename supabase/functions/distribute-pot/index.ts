import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FEE_PERCENT = 5;

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

    // Verify admin or system call (could be enhanced)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { challenge_id, battle_id, winner_id }: DistributeRequest = await req.json();

    console.log(`Distributing pot for challenge: ${challenge_id} to winner: ${winner_id}`);

    if (!winner_id) {
      throw new Error('Winner ID is required');
    }

    let potTotal = 0;
    let title = '';

    if (challenge_id) {
      // Get challenge details
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

      // Mark challenge as completed
      await supabase
        .from('open_challenges')
        .update({ status: 'completed' })
        .eq('id', challenge_id);
    } else if (battle_id) {
      // Get battle pot from battle_donations
      const { data: donations } = await supabase
        .from('battle_donations')
        .select('amount_bb')
        .eq('battle_id', battle_id);
      
      potTotal = donations?.reduce((sum, d) => sum + d.amount_bb, 0) || 0;
      title = 'Battle';
    } else {
      throw new Error('Either challenge_id or battle_id is required');
    }

    if (potTotal <= 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pot to distribute', payout: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculate platform fee and winner payout
    const platformFee = Math.floor(potTotal * (PLATFORM_FEE_PERCENT / 100));
    const winnerPayout = potTotal - platformFee;

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
        description: `Won "${title}" - Pot: ${potTotal} BB, Fee: ${platformFee} BB`,
        reference_id: challenge_id || battle_id
      });

    // Record platform fee as platform transaction
    await supabase
      .from('platform_transactions')
      .insert({
        amount_cents: platformFee * 20, // Convert BB to cents
        transaction_type: 'challenge_fee',
        description: `Platform fee from "${title}"`,
        reference_id: challenge_id || battle_id,
        source_user_id: winner_id
      });

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
          platform_fee: platformFee
        }
      });

    console.log(`Pot distributed: ${winnerPayout} BB to winner, ${platformFee} BB platform fee`);

    return new Response(
      JSON.stringify({
        success: true,
        pot_total: potTotal,
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
    console.error('Distribute pot error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to distribute pot' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
