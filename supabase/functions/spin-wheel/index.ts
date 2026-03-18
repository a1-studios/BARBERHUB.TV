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
    const { prize_bb } = body;

    // Cap max prize at 100 BB to prevent manipulation
    const clampedPrize = Math.min(Math.max(prize_bb || 0, 0), 100);

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
    if (currentBalance < SPIN_COST) {
      return new Response(JSON.stringify({ error: 'Insufficient BB', required: SPIN_COST, balance: currentBalance }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Net change: prize - cost
    const netChange = clampedPrize - SPIN_COST;
    const newBalance = currentBalance + netChange;

    // Update balance with optimistic lock to prevent race conditions
    const { error: updateErr, data: updateResult } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance })
      .eq('user_id', user.id)
      .eq('barber_bucks', currentBalance) // Optimistic lock: only update if balance hasn't changed
      .select('barber_bucks')
      .single();

    if (updateErr || !updateResult) {
      return new Response(JSON.stringify({ error: 'Balance changed during spin, please try again' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record deduction transaction
    await supabase.from('barber_bucks_transactions').insert({
      user_id: user.id,
      amount: -SPIN_COST,
      balance_after: currentBalance - SPIN_COST,
      transaction_type: 'spin_cost',
      description: 'Spin wheel entry fee',
    });

    // Record prize transaction
    if (clampedPrize > 0) {
      await supabase.from('barber_bucks_transactions').insert({
        user_id: user.id,
        amount: clampedPrize,
        balance_after: newBalance,
        transaction_type: 'spin_prize',
        description: `Spin wheel prize: ${clampedPrize} BB`,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      cost: SPIN_COST,
      prize_bb: clampedPrize,
      net_change: netChange,
      new_balance: newBalance,
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
