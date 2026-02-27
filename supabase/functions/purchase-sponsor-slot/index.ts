import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLOT_PRICES: Record<number, number> = {
  1: 50,
  3: 120,
  7: 250,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw { status: 401, message: 'Unauthorized' };
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw { status: 401, message: 'Unauthorized' };

    const { duration_days, name, message, logo_url, link } = await req.json();

    if (!duration_days || !SLOT_PRICES[duration_days]) {
      throw { status: 400, message: 'Invalid duration. Choose 1, 3, or 7 days.' };
    }

    const bbCost = SLOT_PRICES[duration_days];

    // Get current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barber_bucks, display_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) throw { status: 404, message: 'Profile not found' };
    if ((profile.barber_bucks || 0) < bbCost) {
      throw { status: 400, message: `Insufficient BB. Need ${bbCost} BB, have ${profile.barber_bucks || 0} BB.` };
    }

    const newBalance = (profile.barber_bucks || 0) - bbCost;
    const highlightEnd = new Date();
    highlightEnd.setDate(highlightEnd.getDate() + duration_days);

    // Deduct BB
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance, sub_category: 'official_sponsor' })
      .eq('user_id', user.id);
    if (deductError) throw deductError;

    // Record transaction
    await supabase.from('barber_bucks_transactions').insert({
      user_id: user.id,
      amount: -bbCost,
      balance_after: newBalance,
      transaction_type: 'sponsor_purchase',
      description: `Sponsor board slot (${duration_days} day${duration_days > 1 ? 's' : ''})`,
    });

    // Insert sponsor ad
    const { data: maxOrder } = await supabase
      .from('sponsor_ads' as any)
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = ((maxOrder as any)?.[0]?.display_order || 0) + 1;

    await (supabase.from('sponsor_ads' as any) as any).insert({
      name: name || profile.display_name || 'Sponsor',
      message: message || `${profile.display_name || 'A fan'} is an Official Sponsor!`,
      highlight_end: highlightEnd.toISOString(),
      logo_url: logo_url || null,
      link: link || null,
      is_active: true,
      display_order: nextOrder,
      created_by: user.id,
    });

    return new Response(JSON.stringify({
      success: true,
      new_balance: newBalance,
      highlight_end: highlightEnd.toISOString(),
      duration_days,
      bb_cost: bbCost,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    const status = error.status || 500;
    const message = error.message || 'Internal error';
    console.error('Purchase sponsor slot error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
