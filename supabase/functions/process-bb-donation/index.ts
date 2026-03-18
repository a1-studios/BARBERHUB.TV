import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 5% platform fee on direct tips: 3% M4M + 2% BarberHub
const M4M_FEE_PERCENT = 3;
const PLATFORM_FEE_PERCENT = 2;

interface DonationRequest {
  creator_id: string;
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

    const { creator_id, amount_bb, message }: DonationRequest = await req.json();

    console.log(`Processing BB donation: ${amount_bb} BB from ${user.id} to ${creator_id}`);

    if (!amount_bb || amount_bb < 5) {
      throw new Error('Minimum donation is 5 BB');
    }

    // Calculate fee split
    const m4mFee = Math.floor(amount_bb * (M4M_FEE_PERCENT / 100));
    const platformFee = Math.floor(amount_bb * (PLATFORM_FEE_PERCENT / 100));
    const creatorAmount = amount_bb - m4mFee - platformFee;

    // Use FOR UPDATE locks to prevent race conditions
    // We do this via raw RPC since Supabase JS doesn't support FOR UPDATE directly
    // Instead, we'll use a single transaction-like approach with service role

    // Get donor's current balance (service role bypasses RLS)
    const { data: donorProfile, error: donorError } = await supabase
      .from('profiles')
      .select('barber_bucks, display_name')
      .eq('user_id', user.id)
      .single();

    if (donorError || !donorProfile) {
      throw new Error('Could not find donor profile');
    }

    const currentBalance = donorProfile.barber_bucks || 0;

    if (currentBalance < amount_bb) {
      throw new Error(`Insufficient Barber Bucks. You have ${currentBalance} BB but need ${amount_bb} BB.`);
    }

    // Get creator's current balance
    const { data: creatorProfile, error: creatorError } = await supabase
      .from('profiles')
      .select('barber_bucks, display_name')
      .eq('user_id', creator_id)
      .single();

    if (creatorError || !creatorProfile) {
      throw new Error('Could not find creator profile');
    }

    const creatorCurrentBalance = creatorProfile.barber_bucks || 0;

    // Deduct full amount from donor
    const newDonorBalance = currentBalance - amount_bb;
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newDonorBalance })
      .eq('user_id', user.id)
      .eq('barber_bucks', currentBalance); // Optimistic lock

    if (deductError) {
      throw new Error('Failed to deduct BB from donor');
    }

    // Add creator amount (minus fees) to creator
    const newCreatorBalance = creatorCurrentBalance + creatorAmount;
    const { error: addError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newCreatorBalance })
      .eq('user_id', creator_id);

    if (addError) {
      // Rollback donor deduction
      await supabase
        .from('profiles')
        .update({ barber_bucks: currentBalance })
        .eq('user_id', user.id);
      throw new Error('Failed to add BB to creator');
    }

    // Record donor transaction (deduction)
    await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id: user.id,
        amount: -amount_bb,
        balance_after: newDonorBalance,
        transaction_type: 'donation_sent',
        description: `Tip to ${creatorProfile.display_name || 'creator'}`,
        reference_id: creator_id
      });

    // Record creator transaction (receipt — net of fees)
    await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id: creator_id,
        amount: creatorAmount,
        balance_after: newCreatorBalance,
        transaction_type: 'donation_received',
        description: `Tip from ${donorProfile.display_name || 'supporter'}${message ? `: "${message.substring(0, 50)}"` : ''} (${creatorAmount}/${amount_bb} BB after fees)`,
        reference_id: user.id
      });

    // Route M4M fee to fund ledger (3%)
    if (m4mFee > 0) {
      await supabase
        .from('m4m_fund_ledger')
        .insert({
          amount_bb: m4mFee,
          source_type: 'direct_tip_fee',
          reference_id: user.id,
        });
    }

    // Record platform fee (2%) as platform transaction
    if (platformFee > 0) {
      await supabase
        .from('platform_transactions')
        .insert({
          amount_cents: platformFee * 20,
          transaction_type: 'tip_platform_fee',
          description: `2% platform fee on ${amount_bb} BB tip`,
          reference_id: creator_id,
          source_user_id: user.id,
        });
    }

    // Create notification for creator
    await supabase
      .from('notifications')
      .insert({
        user_id: creator_id,
        type: 'donation_received',
        title: '💰 New Tip!',
        message: `${donorProfile.display_name || 'Someone'} sent you ${creatorAmount} Barber Bucks!${message ? ` "${message.substring(0, 100)}"` : ''}`,
        data: {
          donor_id: user.id,
          amount_bb: creatorAmount,
          original_amount: amount_bb,
          m4m_fee: m4mFee,
          platform_fee: platformFee,
          message: message
        }
      });

    console.log(`Donation successful: ${creatorAmount} BB to creator, ${m4mFee} BB M4M, ${platformFee} BB platform`);

    return new Response(
      JSON.stringify({
        success: true,
        amount_bb,
        creator_received: creatorAmount,
        m4m_fee: m4mFee,
        platform_fee: platformFee,
        new_balance: newDonorBalance,
        message: 'Donation successful'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Donation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process donation' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
