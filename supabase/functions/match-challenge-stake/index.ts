import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔴 DEV BYPASS — set to false before going live
const DEV_BYPASS = true;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchRequest {
  challenge_id: string;
  stream_url?: string;
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

    const { challenge_id, stream_url }: MatchRequest = await req.json();

    console.log(`Matching challenge stake: ${challenge_id} by ${user.id}`);

    // Silver+ subscription check for acceptor
    if (!DEV_BYPASS) {
      const { data: subscription, error: subError } = await supabase
        .from('barber_subscriptions')
        .select('id, tier:barber_subscription_tiers(tier_name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) {
        console.error('Subscription check error:', subError);
        throw new Error('Could not verify subscription');
      }

      const tierName = (subscription?.tier as any)?.tier_name || 'free';
      if (!['silver', 'gold', 'diamond'].includes(tierName)) {
        throw new Error('Silver+ subscription required to accept challenges. Upgrade your tier to unlock challenges.');
      }
    }

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('open_challenges')
      .select('*')
      .eq('id', challenge_id)
      .single();

    if (challengeError || !challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.status !== 'waiting_for_opponent') {
      throw new Error('This challenge is no longer available');
    }

    // Check if challenge expired
    if (challenge.expires_at && new Date(challenge.expires_at) < new Date()) {
      throw new Error('This challenge has expired');
    }

    if (challenge.challenger_id === user.id) {
      throw new Error('You cannot accept your own challenge');
    }

    const stakeToMatch = challenge.stake_amount;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barber_bucks, display_name, username')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not find your profile');
    }

    const currentBalance = profile.barber_bucks || 0;

    if (currentBalance < stakeToMatch) {
      throw new Error(`Insufficient Barber Bucks. You need ${stakeToMatch} BB to match this challenge but have ${currentBalance} BB.`);
    }

    // Deduct stake from acceptor (escrow)
    const newBalance = currentBalance - stakeToMatch;
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance })
      .eq('user_id', user.id);

    if (deductError) {
      throw new Error('Failed to deduct stake');
    }

    // Record escrow transaction
    await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id: user.id,
        amount: -stakeToMatch,
        balance_after: newBalance,
        transaction_type: 'challenge_stake_escrow',
        description: `Matched challenge stake: "${challenge.title}"`,
        reference_id: challenge_id
      });

    // Calculate platform fee (5%) and add to jackpot pool
    const totalPot = (challenge.pot_total || 0) + stakeToMatch;
    const platformFee = Math.floor(totalPot * 0.05);

    // Update challenge_prize_pool (jackpot)
    const currentYear = new Date().getFullYear();
    const { data: existingPool } = await supabase
      .from('challenge_prize_pool')
      .select('id, total_pool_bb, platform_fees_collected_bb')
      .eq('pool_year', currentYear)
      .maybeSingle();

    if (existingPool) {
      await supabase
        .from('challenge_prize_pool')
        .update({
          total_pool_bb: (existingPool.total_pool_bb || 0) + platformFee,
          platform_fees_collected_bb: (existingPool.platform_fees_collected_bb || 0) + platformFee,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existingPool.id);
    }

    // Update challenge - mark as accepted
    const { error: updateError } = await supabase
      .from('open_challenges')
      .update({
        accepted_by_id: user.id,
        accepted_by_username: profile.display_name || profile.username || 'Anonymous',
        accepted_at: new Date().toISOString(),
        status: 'accepted',
        opponent_stake_matched: true,
        pot_total: totalPot,
        platform_fee_collected: platformFee,
      })
      .eq('id', challenge_id);

    if (updateError) {
      // Rollback stake
      await supabase
        .from('profiles')
        .update({ barber_bucks: currentBalance })
        .eq('user_id', user.id);
      throw new Error('Failed to accept challenge');
    }

    // Notify challenger
    await supabase
      .from('notifications')
      .insert({
        user_id: challenge.challenger_id,
        type: 'challenge_accepted',
        title: '⚔️ Challenge Accepted!',
        message: `${profile.display_name || 'A barber'} accepted your challenge "${challenge.title}"! Total pot: ${totalPot} BB`,
        data: {
          challenge_id,
          opponent_id: user.id,
          pot_total: totalPot
        }
      });

    console.log(`Challenge matched: ${challenge_id}, pot: ${totalPot} BB, fee: ${platformFee} BB`);

    return new Response(
      JSON.stringify({
        success: true,
        challenge_id,
        pot_total: totalPot,
        new_balance: newBalance,
        message: `Challenge accepted! Total pot: ${totalPot} BB`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Match challenge error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to match challenge' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
