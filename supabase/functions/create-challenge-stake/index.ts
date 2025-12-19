import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_STAKE_BB = 100;

interface StakeRequest {
  title: string;
  stake_amount: number;
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

    const { title, stake_amount, stream_url }: StakeRequest = await req.json();

    console.log(`Creating challenge stake: ${stake_amount} BB from ${user.id}`);

    // Validate stake amount
    if (!stake_amount || stake_amount < MIN_STAKE_BB) {
      throw new Error(`Minimum stake is ${MIN_STAKE_BB} BB`);
    }

    if (!title || !stream_url) {
      throw new Error('Missing required fields: title, stream_url');
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

    // Create challenge with stake
    const { data: challenge, error: challengeError } = await supabase
      .from('open_challenges')
      .insert({
        challenger_id: user.id,
        challenger_username: profile.display_name || profile.username || 'Anonymous',
        challenger_stream_url: stream_url,
        title,
        stake_amount,
        pot_total: stake_amount,
        donations_total: 0,
        status: 'open'
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

    console.log(`Challenge created with ${stake_amount} BB stake: ${challenge.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        challenge,
        new_balance: newBalance,
        stake_amount,
        message: `Challenge created with ${stake_amount} BB stake!`
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
