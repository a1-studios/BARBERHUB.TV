import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🔴 DEV BYPASS — set to false before going live
const DEV_BYPASS = true;

const MAX_DURATION_MINUTES = 15;

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

    const { title, stake_amount, challenge_message, duration_minutes, target_barber_id }: StakeRequest = await req.json();

    if (!title) {
      throw new Error('Missing required field: title');
    }

    // Read sovereign-controlled platform config (Quick Play + stake settings)
    const { data: stateRows } = await supabase
      .from('platform_state')
      .select('key, value')
      .in('key', ['challenge_stakes_enabled', 'challenge_min_stake_bb', 'quick_play_enabled']);

    const stateMap = (stateRows || []).reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = String(row.value ?? '');
      return acc;
    }, {});

    // Quick Play master switch — default ON. Reject if Sovereign disabled it.
    const quickPlayEnabled = (stateMap.quick_play_enabled ?? 'true') !== 'false';
    if (!quickPlayEnabled) {
      return new Response(
        JSON.stringify({ error: 'Quick Play is currently disabled by the platform.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const stakesEnabled = stateMap.challenge_stakes_enabled === 'true';
    const minStakeBB = parseInt(stateMap.challenge_min_stake_bb || '100', 10) || 100;

    // Effective stake: 0 when stakes are globally disabled
    const effectiveStake = stakesEnabled ? (stake_amount ?? 0) : 0;

    console.log(`Creating challenge: stakesEnabled=${stakesEnabled}, requested=${stake_amount}, effective=${effectiveStake} BB from ${user.id}`);

    // Validate stake amount only when stakes are required
    if (stakesEnabled) {
      if (!effectiveStake || effectiveStake < minStakeBB) {
        throw new Error(`Minimum stake is ${minStakeBB} BB`);
      }
    }

    // Silver+ subscription check (only when stakes are enabled)
    if (stakesEnabled && !DEV_BYPASS) {
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

    // Balance check + escrow only when there's an actual stake
    let newBalance = currentBalance;
    if (effectiveStake > 0) {
      if (currentBalance < effectiveStake) {
        throw new Error(`Insufficient Barber Bucks. You need ${effectiveStake} BB but have ${currentBalance} BB.`);
      }

      newBalance = currentBalance - effectiveStake;
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
          amount: -effectiveStake,
          balance_after: newBalance,
          transaction_type: 'challenge_stake_escrow',
          description: `Challenge stake escrow: "${title}"`,
        });
    }

    // Calculate duration and expiration
    const durationMins = Math.min(duration_minutes || MAX_DURATION_MINUTES, MAX_DURATION_MINUTES);
    const expiresAt = new Date(Date.now() + durationMins * 60 * 1000).toISOString();

    // Resolve challenger's barber_profiles.id so we can pre-seat them in the battle.
    // Guarantee a row exists so ContenderTheater can position them as barber1.
    let { data: challengerBarberProfile } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!challengerBarberProfile?.id) {
      const { data: created } = await supabase
        .from('barber_profiles')
        .insert({ user_id: user.id, name: profile.display_name || profile.username || 'Barber' })
        .select('id')
        .single();
      challengerBarberProfile = created ?? null;
    }

    // Pre-create a battle record so complete-open-challenge can link to it.
    // prize_amount starts at 2x stake (or 0 when free) — viewer donations grow it.
    // match_mode='quick_play' keeps this out of tournament brackets/standings/feed.
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .insert({
        title,
        organizer_id: user.id,
        battle_type: 'challenge',
        match_mode: 'quick_play',
        status: 'upcoming',
        currency: 'BB',
        prize_amount: effectiveStake * 2,
        barber1_id: challengerBarberProfile?.id ?? null,
        barber2_id: null,
      })
      .select('id')
      .single();

    if (battleError) {
      // Rollback stake if we deducted one
      if (effectiveStake > 0) {
        await supabase
          .from('profiles')
          .update({ barber_bucks: currentBalance })
          .eq('user_id', user.id);
      }
      console.error('Battle pre-create error:', battleError);
      throw new Error('Failed to create battle record');
    }

    // Create challenge with stake (or zero-stake donation-only)
    // NOTE: open_challenges has no `battle_type` column — battle_type lives on the battles row.
    const { data: challenge, error: challengeError } = await supabase
      .from('open_challenges')
      .insert({
        challenger_id: user.id,
        challenger_username: profile.display_name || profile.username || 'Anonymous',
        challenger_stream_url: 'pending',
        title,
        stake_amount: effectiveStake,
        pot_total: effectiveStake,
        donations_total: 0,
        status: 'waiting_for_opponent',
        bounty_description: challenge_message || null,
        duration_minutes: durationMins,
        expires_at: expiresAt,
        battle_id: battle.id,
        match_mode: 'quick_play',
        ...(target_barber_id ? { target_barber_id } : {}),
      })
      .select()
      .single();

    if (challengeError) {
      // Rollback stake if we deducted one
      if (effectiveStake > 0) {
        await supabase
          .from('profiles')
          .update({ barber_bucks: currentBalance })
          .eq('user_id', user.id);
      }
      console.error('Challenge create error:', challengeError);
      throw new Error('Failed to create challenge');
    }

    // Notify the targeted barber so they get a realtime alert + can deep-link to accept
    if (target_barber_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: target_barber_id,
          type: 'challenge_received',
          title: "⚔️ You've Been Challenged!",
          message: `${profile.display_name || profile.username || 'A barber'} challenged you to "${title}"${effectiveStake > 0 ? ` for ${effectiveStake} BB` : ' (free — viewer donations build the pot)'}.`,
          data: {
            challenge_id: challenge.id,
            battle_id: battle.id,
            challenger_id: user.id,
            stake_amount: effectiveStake,
          },
        });
    }

    const message = effectiveStake > 0
      ? `Challenge created with ${effectiveStake} BB stake! Expires in ${durationMins} minutes.`
      : `Challenge issued! Viewers can donate to grow the winner's pot. Expires in ${durationMins} minutes.`;

    console.log(`Challenge created (stake=${effectiveStake}): ${challenge.id}, battle=${battle.id}, expires ${expiresAt}`);

    return new Response(
      JSON.stringify({
        success: true,
        challenge,
        battle_id: battle.id,
        new_balance: newBalance,
        stake_amount: effectiveStake,
        expires_at: expiresAt,
        stakes_enabled: stakesEnabled,
        message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Challenge stake error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to create challenge stake' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
