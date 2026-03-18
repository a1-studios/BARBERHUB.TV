import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPIN_COST = 5;

interface SpinRequest {
  role: 'barber' | 'fan';
  prize_id: string;
  prize_bb: number;
  prize_type?: string;
  prize_label?: string;
  duration_months?: number;
  is_free_spin?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SpinRequest = await req.json();
    const { prize_bb, is_free_spin, prize_type, prize_label, duration_months } = body;

    // Cap max prize at 100 BB to prevent manipulation
    const clampedPrize = Math.min(Math.max(prize_bb || 0, 0), 100);
    const isFree = is_free_spin === true;

    // Prevent double-claiming free spins
    if (isFree) {
      const { data: existingFree } = await supabase
        .from('barber_bucks_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('transaction_type', 'free_spin_prize')
        .limit(1);

      if (existingFree && existingFree.length > 0) {
        return new Response(JSON.stringify({ error: 'Free spin already claimed', already_claimed: true }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get current balance
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('barber_bucks')
      .eq('user_id', user.id)
      .single();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentBalance = profile.barber_bucks || 0;
    const actualCost = isFree ? 0 : SPIN_COST;

    if (!isFree && currentBalance < SPIN_COST) {
      return new Response(JSON.stringify({ error: 'Insufficient BB', required: SPIN_COST, balance: currentBalance }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Net change: prize - cost
    const netChange = clampedPrize - actualCost;
    const newBalance = currentBalance + netChange;

    // Update balance with optimistic lock
    const { error: updateErr, data: updateResult } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance })
      .eq('user_id', user.id)
      .eq('barber_bucks', currentBalance)
      .select('barber_bucks')
      .single();

    if (updateErr || !updateResult) {
      return new Response(JSON.stringify({ error: 'Balance changed during spin, please try again' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record deduction transaction (skip for free spins)
    if (!isFree) {
      await supabase.from('barber_bucks_transactions').insert({
        user_id: user.id,
        amount: -SPIN_COST,
        balance_after: currentBalance - SPIN_COST,
        transaction_type: 'spin_cost',
        description: 'Spin wheel entry fee',
      });
    }

    // Record prize transaction
    if (clampedPrize > 0) {
      await supabase.from('barber_bucks_transactions').insert({
        user_id: user.id,
        amount: clampedPrize,
        balance_after: newBalance,
        transaction_type: isFree ? 'free_spin_prize' : 'spin_prize',
        description: isFree
          ? `Welcome free spin prize: ${clampedPrize} BB`
          : `Spin wheel prize: ${clampedPrize} BB`,
      });
    }

    // Record non-BB prizes into user_prizes table
    const effectiveType = prize_type || 'bb';
    if (effectiveType !== 'bb' && prize_label) {
      const expiresAt = (duration_months && duration_months > 0)
        ? new Date(Date.now() + duration_months * 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await supabase.from('user_prizes').insert({
        user_id: user.id,
        prize_type: effectiveType,
        prize_label: prize_label,
        bb_value: clampedPrize,
        duration_months: duration_months || 0,
        status: 'active',
        expires_at: expiresAt,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      cost: actualCost,
      prize_bb: clampedPrize,
      net_change: netChange,
      new_balance: newBalance,
      is_free_spin: isFree,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
