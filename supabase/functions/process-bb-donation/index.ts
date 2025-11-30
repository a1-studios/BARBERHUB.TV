import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DonationRequest {
  creator_id: string;
  amount_bb: number;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from auth header
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

    // Validate amount
    if (!amount_bb || amount_bb < 5) {
      throw new Error('Minimum donation is 5 BB');
    }

    // Get donor's current balance
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

    // Deduct from donor
    const newDonorBalance = currentBalance - amount_bb;
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newDonorBalance })
      .eq('user_id', user.id);

    if (deductError) {
      throw new Error('Failed to deduct BB from donor');
    }

    // Add to creator
    const newCreatorBalance = creatorCurrentBalance + amount_bb;
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
        description: `Donation to ${creatorProfile.display_name || 'creator'}`,
        reference_id: creator_id
      });

    // Record creator transaction (receipt)
    await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id: creator_id,
        amount: amount_bb,
        balance_after: newCreatorBalance,
        transaction_type: 'donation_received',
        description: `Donation from ${donorProfile.display_name || 'supporter'}${message ? `: "${message.substring(0, 50)}"` : ''}`,
        reference_id: user.id
      });

    // Create notification for creator
    await supabase
      .from('notifications')
      .insert({
        user_id: creator_id,
        type: 'donation_received',
        title: '💰 New Donation!',
        message: `${donorProfile.display_name || 'Someone'} sent you ${amount_bb} Barber Bucks!${message ? ` "${message.substring(0, 100)}"` : ''}`,
        data: {
          donor_id: user.id,
          amount_bb: amount_bb,
          message: message
        }
      });

    // Update creator's total earnings
    await supabase
      .from('profiles')
      .update({ 
        total_earnings: (creatorProfile as any).total_earnings 
          ? (creatorProfile as any).total_earnings + amount_bb 
          : amount_bb 
      })
      .eq('user_id', creator_id);

    console.log(`Donation successful: ${amount_bb} BB transferred`);

    return new Response(
      JSON.stringify({
        success: true,
        amount_bb,
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
