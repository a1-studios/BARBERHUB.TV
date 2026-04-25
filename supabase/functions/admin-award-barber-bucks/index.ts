import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardRequest {
  user_id: string;
  amount: number;
  reason: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the admin user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error('Admin access required');
    }

    const { user_id, amount, reason, notes }: AwardRequest = await req.json();

    // Get current balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('barber_bucks')
      .eq('user_id', user_id)
      .single();

    const currentBalance = profile?.barber_bucks || 0;
    const newBalance = currentBalance + amount;

    // Update user's balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance })
      .eq('user_id', user_id);

    if (updateError) throw updateError;

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id,
        amount,
        balance_after: newBalance,
        transaction_type: 'admin_adjustment',
        description: `${reason}${notes ? `: ${notes}` : ''}`
      });

    if (transactionError) throw transactionError;

    // Create notification for user
    await supabase.from('notifications').insert({
      user_id,
      type: amount > 0 ? 'barber_bucks_award' : 'barber_bucks_deduction',
      title: amount > 0 ? '💰 Barber Bucks Awarded!' : '💸 Barber Bucks Adjusted',
      message: `You ${amount > 0 ? 'received' : 'were charged'} ${Math.abs(amount)} Barber Bucks: ${reason}`,
      data: { amount, reason, notes }
    });

    // Log admin action
    await supabase.from('admin_action_logs').insert({
      admin_id: user.id,
      action_type: 'award_barber_bucks',
      entity_type: 'user',
      entity_id: user_id,
      details: { amount, reason, notes, previous_balance: currentBalance, new_balance: newBalance }
    });

    return new Response(
      JSON.stringify({ success: true, new_balance: newBalance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error awarding Barber Bucks:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});