import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOURNAMENT_ENTRY_FEE_BB = 250; // $50 equivalent at 5 BB = $1

interface RegistrationRequest {
  category: string;
  barber_profile_id: string;
  country_code: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { category, barber_profile_id, country_code }: RegistrationRequest = await req.json();

    console.log(`Processing tournament registration: ${category} for user ${user.id}`);

    if (!category || !barber_profile_id || !country_code) {
      throw new Error('Missing required fields: category, barber_profile_id, country_code');
    }

    // Check if already in queue for this category
    const { data: existingEntry, error: checkError } = await supabase
      .from('tournament_queue')
      .select('id')
      .eq('user_id', user.id)
      .eq('category', category)
      .in('status', ['waiting', 'matched'])
      .maybeSingle();

    if (checkError) {
      console.error('Queue check error:', checkError);
      throw new Error('Failed to check existing queue entries');
    }

    if (existingEntry) {
      throw new Error(`You're already in the queue for ${category}`);
    }

    // Get user's current BB balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barber_bucks, display_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not find your profile');
    }

    const currentBalance = profile.barber_bucks || 0;

    if (currentBalance < TOURNAMENT_ENTRY_FEE_BB) {
      throw new Error(`Insufficient Barber Bucks. You need ${TOURNAMENT_ENTRY_FEE_BB} BB but have ${currentBalance} BB. Please add funds.`);
    }

    // Deduct BB from user
    const newBalance = currentBalance - TOURNAMENT_ENTRY_FEE_BB;
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Deduct error:', deductError);
      throw new Error('Failed to deduct entry fee');
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id: user.id,
        amount: -TOURNAMENT_ENTRY_FEE_BB,
        balance_after: newBalance,
        transaction_type: 'tournament_entry',
        description: `Tournament entry fee for ${category}`,
        reference_id: category
      });

    if (txError) {
      console.error('Transaction record error:', txError);
      // Non-fatal, continue
    }

    // Add to tournament queue
    const { data: queueEntry, error: queueError } = await supabase
      .from('tournament_queue')
      .insert({
        user_id: user.id,
        barber_profile_id,
        category,
        country_code,
        status: 'waiting',
        payment_status: 'completed'
      })
      .select()
      .single();

    if (queueError) {
      console.error('Queue insert error:', queueError);
      // Rollback BB deduction
      await supabase
        .from('profiles')
        .update({ barber_bucks: currentBalance })
        .eq('user_id', user.id);
      throw new Error('Failed to join tournament queue');
    }

    // Update category prize pool
    const currentYear = new Date().getFullYear();
    const { error: poolError } = await supabase.rpc('update_category_prize_pool', {
      p_category: category,
      p_entry_amount_cents: TOURNAMENT_ENTRY_FEE_BB * 20, // Convert BB to cents (5 BB = $1 = 100 cents)
      p_donation_amount_cents: 0,
      p_platform_fee_cents: TOURNAMENT_ENTRY_FEE_BB * 1, // 5% platform fee
      p_increment_participants: true
    });

    if (poolError) {
      console.error('Prize pool update error:', poolError);
      // Non-fatal, continue
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'tournament_joined',
        title: '🏆 Tournament Queue Joined!',
        message: `You've joined the ${category} tournament queue. Entry fee: ${TOURNAMENT_ENTRY_FEE_BB} BB. Watch for your match notification!`,
        data: {
          category,
          queue_entry_id: queueEntry.id,
          entry_fee_bb: TOURNAMENT_ENTRY_FEE_BB
        }
      });

    console.log(`Tournament registration successful for ${user.id} in ${category}`);

    return new Response(
      JSON.stringify({
        success: true,
        queue_entry: queueEntry,
        new_balance: newBalance,
        entry_fee_bb: TOURNAMENT_ENTRY_FEE_BB,
        message: `Successfully joined ${category} tournament queue!`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Tournament registration error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to register for tournament' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
