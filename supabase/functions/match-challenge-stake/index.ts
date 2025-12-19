import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchRequest {
  challenge_id: string;
  stream_url: string;
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

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('open_challenges')
      .select('*')
      .eq('id', challenge_id)
      .single();

    if (challengeError || !challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.status !== 'open') {
      throw new Error('This challenge is no longer available');
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

    // Update challenge - mark as accepted
    const newPotTotal = challenge.pot_total + stakeToMatch;
    const { error: updateError } = await supabase
      .from('open_challenges')
      .update({
        accepted_by_id: user.id,
        accepted_by_username: profile.display_name || profile.username || 'Anonymous',
        accepted_at: new Date().toISOString(),
        status: 'accepted',
        opponent_stake_matched: true,
        pot_total: newPotTotal
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
        message: `${profile.display_name || 'A barber'} accepted your challenge "${challenge.title}"! Total pot: ${newPotTotal} BB`,
        data: {
          challenge_id,
          opponent_id: user.id,
          pot_total: newPotTotal
        }
      });

    console.log(`Challenge matched: ${challenge_id}, pot: ${newPotTotal} BB`);

    return new Response(
      JSON.stringify({
        success: true,
        challenge_id,
        pot_total: newPotTotal,
        new_balance: newBalance,
        message: `Challenge accepted! Total pot: ${newPotTotal} BB`
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
