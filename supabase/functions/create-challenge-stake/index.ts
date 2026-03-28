import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🔴 DEV BYPASS — set to false before going live
const DEV_BYPASS = true;

const MIN_STAKE_BB = 100;
const MAX_DURATION_MINUTES = 60;

interface StakeRequest {
  title: string;
  stake_amount: number;
  challenge_message?: string;
  duration_minutes?: number;
  target_barber_id?: string;
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

    const { title, stake_amount, challenge_message, duration_minutes }: StakeRequest = await req.json();

    console.log(`Creating challenge stake: ${stake_amount} BB from ${user.id}`);

    // Validate stake amount
    if (!stake_amount || stake_amount < MIN_STAKE_BB) {
      throw new Error(`Minimum stake is ${MIN_STAKE_BB} BB`);
    }

    if (!title) {
      throw new Error('Missing required field: title');
    }

    // Silver+ subscription check
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
        throw new Error('Silver+ subscription required to issue challenges. Upgrade your tier to unlock challenges.');
      }
    }

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

    if (currentBalance < stake_amount) {
      throw new Error(`Insufficient Barber Bucks. You need ${stake_amount} BB but have ${currentBalance} BB.`);
    }

    // Calculate duration and expiration
    const durationMins = Math.min(duration_minutes || MAX_DURATION_MINUTES, MAX_DURATION_MINUTES);
    const expiresAt = new Date(Date.now() + durationMins * 60 * 1000).toISOString();

    // Deduct stake from challenger (escrow)
    const newBalance = currentBalance - stake_amount;
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
        amount: -stake_amount,
        balance_after: newBalance,
        transaction_type: 'challenge_stake_escrow',
        description: `Challenge stake escrow: "${title}"`,
      });

    // Pre-create a battle record so complete-open-challenge can link to it
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .insert({
        title,
        organizer_id: user.id,
        battle_type: 'challenge',
        status: 'upcoming',
        currency: 'BB',
        prize_amount: stake_amount * 2,
        barber1_id: null,
        barber2_id: null,
      })
      .select('id')
      .single();

    if (battleError) {
      // Rollback stake
      await supabase
        .from('profiles')
        .update({ barber_bucks: currentBalance })
        .eq('user_id', user.id);
      console.error('Battle pre-create error:', battleError);
      throw new Error('Failed to create battle record');
    }

    // Create challenge with stake
    const { data: challenge, error: challengeError } = await supabase
      .from('open_challenges')
      .insert({
        challenger_id: user.id,
        challenger_username: profile.display_name || profile.username || 'Anonymous',
        challenger_stream_url: 'pending',
        title,
        stake_amount,
        pot_total: stake_amount,
        donations_total: 0,
        status: 'waiting_for_opponent',
        battle_type: 'challenge',
        bounty_description: challenge_message || null,
        duration_minutes: durationMins,
        expires_at: expiresAt,
        battle_id: battle.id,
      })
      .select()
      .single();

    if (challengeError) {
      // Rollback stake
      await supabase
        .from('profiles')
        .update({ barber_bucks: currentBalance })
        .eq('user_id', user.id);
      console.error('Challenge create error:', challengeError);
      throw new Error('Failed to create challenge');
    }

    console.log(`Challenge created with ${stake_amount} BB stake, expires at ${expiresAt}: ${challenge.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        challenge,
        new_balance: newBalance,
        stake_amount,
        expires_at: expiresAt,
        message: `Challenge created with ${stake_amount} BB stake! Expires in ${durationMins} minutes.`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Challenge stake error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create challenge stake' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
