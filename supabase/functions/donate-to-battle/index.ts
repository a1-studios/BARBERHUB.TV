import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DonationRequest {
  battle_id: string;
  barber_id: string; // Which barber in the battle to support
  amount_bb: number;
  message?: string;
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

    const { battle_id, barber_id, amount_bb, message }: DonationRequest = await req.json();

    console.log(`Processing battle donation: ${amount_bb} BB to battle ${battle_id}`);

    if (!amount_bb || amount_bb < 5) {
      throw new Error('Minimum donation is 5 BB');
    }

    // Verify battle exists and is active
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('id, status, title, barber1_id, barber2_id')
      .eq('id', battle_id)
      .single();

    if (battleError || !battle) {
      throw new Error('Battle not found');
    }

    if (!['active', 'voting'].includes(battle.status)) {
      throw new Error('Battle is not accepting donations');
    }

    // Get donor profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barber_bucks, display_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not find your profile');
    }

    const currentBalance = profile.barber_bucks || 0;

    if (currentBalance < amount_bb) {
      throw new Error(`Insufficient Barber Bucks. You have ${currentBalance} BB.`);
    }

    // Deduct from donor
    const newBalance = currentBalance - amount_bb;
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance })
      .eq('user_id', user.id);

    if (deductError) {
      throw new Error('Failed to process donation');
    }

    // Record transaction
    await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id: user.id,
        amount: -amount_bb,
        balance_after: newBalance,
        transaction_type: 'battle_donation',
        description: `Donation to battle: ${battle.title}`,
        reference_id: battle_id
      });

    // Record battle donation for pot tracking
    const { data: donation, error: donationError } = await supabase
      .from('battle_donations')
      .insert({
        battle_id,
        donor_id: user.id,
        donor_name: profile.display_name || 'Anonymous',
        barber_id,
        amount_bb,
        message: message?.substring(0, 200)
      })
      .select()
      .single();

    if (donationError) {
      console.error('Donation record error:', donationError);
    }

    // Update challenge pot if this battle is from a challenge
    const { data: challenge } = await supabase
      .from('open_challenges')
      .select('id, pot_total, donations_total')
      .eq('battle_id', battle_id)
      .maybeSingle();

    if (challenge) {
      await supabase
        .from('open_challenges')
        .update({
          pot_total: (challenge.pot_total || 0) + amount_bb,
          donations_total: (challenge.donations_total || 0) + amount_bb
        })
        .eq('id', challenge.id);
    }

    console.log(`Battle donation successful: ${amount_bb} BB`);

    return new Response(
      JSON.stringify({
        success: true,
        donation_id: donation?.id,
        amount_bb,
        new_balance: newBalance,
        message: 'Donation successful!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Battle donation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process donation' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
