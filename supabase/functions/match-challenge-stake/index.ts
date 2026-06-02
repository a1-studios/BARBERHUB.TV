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
      return new Response(
        JSON.stringify({ error: 'Sign in required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth rejected token:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Sign in required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { challenge_id }: MatchRequest = await req.json();

    console.log(`Matching challenge: ${challenge_id} by ${user.id}`);

    // Quick Play master switch — reject if Sovereign disabled it.
    const { data: qpRow } = await supabase
      .from('platform_state')
      .select('value')
      .eq('key', 'quick_play_enabled')
      .maybeSingle();
    const quickPlayEnabled = (String(qpRow?.value ?? 'true')) !== 'false';
    if (!quickPlayEnabled) {
      return new Response(
        JSON.stringify({ error: 'Quick Play is currently disabled by the platform.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Get challenge first to determine if a stake is required
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

    if (challenge.expires_at && new Date(challenge.expires_at) < new Date()) {
      throw new Error('This challenge has expired');
    }

    if (challenge.challenger_id === user.id) {
      throw new Error('You cannot accept your own challenge');
    }

    // Enforce direct (targeted) challenges — only the named barber can accept.
    if (challenge.target_barber_id && challenge.target_barber_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'This challenge was issued to a different barber.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const stakeToMatch = challenge.stake_amount || 0;
    const isFreeChallenge = stakeToMatch === 0;

    // Silver+ subscription check (only when stakes apply)
    if (!isFreeChallenge && !DEV_BYPASS) {
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
    let newBalance = currentBalance;

    // Balance check + escrow only when there's an actual stake to match
    if (!isFreeChallenge) {
      if (currentBalance < stakeToMatch) {
        throw new Error(`Insufficient Barber Bucks. You need ${stakeToMatch} BB to match this challenge but have ${currentBalance} BB.`);
      }

      newBalance = currentBalance - stakeToMatch;
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
    }

    // Pot total = challenger stake + acceptor stake + any donations already received
    const totalPot = (challenge.pot_total || 0) + stakeToMatch;
    const platformFee = Math.floor(totalPot * 0.05);

    // Update challenge_prize_pool (jackpot) — still earns 5% even on donation-only pots
    const currentYear = new Date().getFullYear();
    const { data: existingPool } = await supabase
      .from('challenge_prize_pool')
      .select('id, total_pool_bb, platform_fees_collected_bb')
      .eq('pool_year', currentYear)
      .maybeSingle();

    if (existingPool && platformFee > 0) {
      await supabase
        .from('challenge_prize_pool')
        .update({
          total_pool_bb: (existingPool.total_pool_bb || 0) + platformFee,
          platform_fees_collected_bb: (existingPool.platform_fees_collected_bb || 0) + platformFee,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existingPool.id);
    }

    // Update challenge - mark as completed (battle live; expire from feed instantly).
    // NOTE: status check constraint only allows 'waiting_for_opponent' | 'completed' | 'expired'.
    // We use 'completed' + expires_at=now() so feed filters drop the row immediately,
    // and the cleanup cron hard-deletes it shortly after.
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('open_challenges')
      .update({
        accepted_by_id: user.id,
        accepted_by_username: profile.display_name || profile.username || 'Anonymous',
        accepted_at: nowIso,
        status: 'completed',
        expires_at: nowIso,
        opponent_stake_matched: true,
        pot_total: totalPot,
        platform_fee_collected: platformFee,
      })
      .eq('id', challenge_id);

    if (updateError) {
      console.error('Failed to update open_challenges row:', updateError);
      // Rollback stake if we deducted one
      if (!isFreeChallenge) {
        await supabase
          .from('profiles')
          .update({ barber_bucks: currentBalance })
          .eq('user_id', user.id);
      }
      throw new Error(`Failed to accept challenge: ${updateError.message}`);
    }

    // Wire the battle: set barber2 to acceptor + flip to live so both clients
    // routed through ContenderTheater can join the same room.
    if (challenge.battle_id) {
      let { data: acceptorBarberProfile } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Guarantee a barber_profiles row so ContenderTheater can position the acceptor.
      if (!acceptorBarberProfile?.id) {
        const { data: created } = await supabase
          .from('barber_profiles')
          .insert({ user_id: user.id, name: profile.display_name || profile.username || 'Barber' })
          .select('id')
          .single();
        acceptorBarberProfile = created ?? null;
      }

      await supabase
        .from('battles')
        .update({
          barber2_id: acceptorBarberProfile?.id ?? null,
          status: 'live',
          prize_amount: totalPot,
        })
        .eq('id', challenge.battle_id);
    }

    // Soft-dismiss any prior challenge notifications for both users so the bell clears.
    // We match notifications whose data->>challenge_id == this challenge for both parties.
    await supabase
      .from('notifications')
      .update({ read: true, dismissed_at: new Date().toISOString() })
      .in('user_id', [challenge.challenger_id, user.id])
      .in('type', ['challenge_received', 'challenge_sent'])
      .filter('data->>challenge_id', 'eq', challenge_id);

    // Notify challenger (deep-linkable to the battle room)
    const notifyMessage = isFreeChallenge
      ? `${profile.display_name || 'A barber'} accepted your challenge "${challenge.title}"! Pot grows from viewer donations.`
      : `${profile.display_name || 'A barber'} accepted your challenge "${challenge.title}"! Total pot: ${totalPot} BB`;

    await supabase
      .from('notifications')
      .insert({
        user_id: challenge.challenger_id,
        type: 'challenge_accepted',
        title: '⚔️ Challenge Accepted — Battle Live!',
        message: notifyMessage,
        data: {
          challenge_id,
          battle_id: challenge.battle_id,
          opponent_id: user.id,
          pot_total: totalPot,
          is_free_challenge: isFreeChallenge,
        }
      });

    console.log(`Challenge matched: ${challenge_id}, stake=${stakeToMatch}, pot=${totalPot} BB, fee=${platformFee} BB`);

    return new Response(
      JSON.stringify({
        success: true,
        challenge_id,
        battle_id: challenge.battle_id,
        pot_total: totalPot,
        new_balance: newBalance,
        message: isFreeChallenge
          ? `Challenge accepted! Viewers can donate to the winner's pot.`
          : `Challenge accepted! Total pot: ${totalPot} BB`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Match challenge error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to match challenge' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
