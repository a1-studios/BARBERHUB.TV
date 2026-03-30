import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = Deno.env.get('SOVEREIGN_EMAIL') || 'a1studios.film@gmail.com';

interface EconomyRequest {
  action: 'mint_bb' | 'burn_bb' | 'transfer_bb' | 'mass_adjust' | 'get_ledger' | 'get_stats';
  target_user_id?: string;
  amount?: number;
  percentage?: number;
  from_user_id?: string;
  to_user_id?: string;
  reason?: string;
  notes?: string;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth header and validate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Security check 1: Email must match
    if (user.email !== SOVEREIGN_EMAIL) {
      console.log(`Unauthorized access attempt by ${user.email}`);
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Security check 2: Must have sovereign role
    const { data: hasRole } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'sovereign' });
    
    if (!hasRole) {
      console.log(`Sovereign role missing for ${user.email}`);
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: EconomyRequest = await req.json();
    const { action, target_user_id, amount, percentage, from_user_id, to_user_id, reason, notes, limit = 50, offset = 0 } = body;

    console.log(`Sovereign economy action: ${action} by ${user.email}`);

    let result: any = null;
    let beforeState: any = null;
    let afterState: any = null;

    switch (action) {
      case 'get_stats': {
        // Get total BB in circulation
        const { data: totalBB } = await supabase
          .from('profiles')
          .select('barber_bucks');
        
        const totalSupply = totalBB?.reduce((sum, p) => sum + (p.barber_bucks || 0), 0) || 0;
        
        // Get recent transactions count
        const { count: txnCount } = await supabase
          .from('barber_bucks_transactions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // Get user count with BB
        const { count: usersWithBB } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('barber_bucks', 0);

        result = { 
          total_supply: totalSupply, 
          transactions_24h: txnCount || 0,
          users_with_bb: usersWithBB || 0
        };
        break;
      }

      case 'get_ledger': {
        const { data: transactions, count } = await supabase
          .from('barber_bucks_transactions')
          .select('*, profiles!barber_bucks_transactions_user_id_fkey(display_name, email)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        result = { transactions, total: count };
        break;
      }

      case 'mint_bb': {
        if (!target_user_id || !amount || amount <= 0) {
          throw new Error('Invalid mint parameters');
        }

        // Get current balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('barber_bucks, display_name')
          .eq('user_id', target_user_id)
          .single();

        beforeState = { barber_bucks: profile?.barber_bucks || 0 };
        const newBalance = (profile?.barber_bucks || 0) + amount;

        // Update balance
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ barber_bucks: newBalance })
          .eq('user_id', target_user_id);

        if (updateError) throw updateError;

        // Record transaction
        await supabase
          .from('barber_bucks_transactions')
          .insert({
            user_id: target_user_id,
            amount: amount,
            balance_after: newBalance,
            transaction_type: 'sovereign_mint',
            description: reason || 'Sovereign mint'
          });

        afterState = { barber_bucks: newBalance };
        result = { success: true, new_balance: newBalance, user_name: profile?.display_name };
        break;
      }

      case 'burn_bb': {
        if (!target_user_id || !amount || amount <= 0) {
          throw new Error('Invalid burn parameters');
        }

        // Get current balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('barber_bucks, display_name')
          .eq('user_id', target_user_id)
          .single();

        const currentBalance = profile?.barber_bucks || 0;
        beforeState = { barber_bucks: currentBalance };
        const newBalance = Math.max(0, currentBalance - amount);
        const actualBurned = currentBalance - newBalance;

        // Update balance
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ barber_bucks: newBalance })
          .eq('user_id', target_user_id);

        if (updateError) throw updateError;

        // Record transaction
        await supabase
          .from('barber_bucks_transactions')
          .insert({
            user_id: target_user_id,
            amount: -actualBurned,
            balance_after: newBalance,
            transaction_type: 'sovereign_burn',
            description: reason || 'Sovereign burn'
          });

        afterState = { barber_bucks: newBalance };
        result = { success: true, new_balance: newBalance, amount_burned: actualBurned, user_name: profile?.display_name };
        break;
      }

      case 'transfer_bb': {
        if (!from_user_id || !to_user_id || !amount || amount <= 0) {
          throw new Error('Invalid transfer parameters');
        }

        // Get both profiles
        const { data: fromProfile } = await supabase
          .from('profiles')
          .select('barber_bucks, display_name')
          .eq('user_id', from_user_id)
          .single();

        const { data: toProfile } = await supabase
          .from('profiles')
          .select('barber_bucks, display_name')
          .eq('user_id', to_user_id)
          .single();

        const fromBalance = fromProfile?.barber_bucks || 0;
        const toBalance = toProfile?.barber_bucks || 0;

        beforeState = { from_balance: fromBalance, to_balance: toBalance };

        const actualTransfer = Math.min(amount, fromBalance);
        const newFromBalance = fromBalance - actualTransfer;
        const newToBalance = toBalance + actualTransfer;

        // Update both balances
        await supabase
          .from('profiles')
          .update({ barber_bucks: newFromBalance })
          .eq('user_id', from_user_id);

        await supabase
          .from('profiles')
          .update({ barber_bucks: newToBalance })
          .eq('user_id', to_user_id);

        // Record transactions
        await supabase
          .from('barber_bucks_transactions')
          .insert([
            {
              user_id: from_user_id,
              amount: -actualTransfer,
              balance_after: newFromBalance,
              transaction_type: 'sovereign_transfer_out',
              description: reason || `Sovereign transfer to ${toProfile?.display_name}`
            },
            {
              user_id: to_user_id,
              amount: actualTransfer,
              balance_after: newToBalance,
              transaction_type: 'sovereign_transfer_in',
              description: reason || `Sovereign transfer from ${fromProfile?.display_name}`
            }
          ]);

        afterState = { from_balance: newFromBalance, to_balance: newToBalance };
        result = { 
          success: true, 
          amount_transferred: actualTransfer,
          from_new_balance: newFromBalance,
          to_new_balance: newToBalance
        };
        break;
      }

      case 'mass_adjust': {
        if (!percentage) {
          throw new Error('Invalid mass adjust parameters');
        }

        // Get all profiles with BB
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, barber_bucks')
          .gt('barber_bucks', 0);

        if (!profiles || profiles.length === 0) {
          throw new Error('No profiles with BB found');
        }

        beforeState = { total_users: profiles.length };
        let totalAdjusted = 0;

        for (const profile of profiles) {
          const adjustment = Math.floor(profile.barber_bucks * (percentage / 100));
          const newBalance = Math.max(0, profile.barber_bucks + adjustment);
          
          await supabase
            .from('profiles')
            .update({ barber_bucks: newBalance })
            .eq('user_id', profile.user_id);

          await supabase
            .from('barber_bucks_transactions')
            .insert({
              user_id: profile.user_id,
              amount: adjustment,
              balance_after: newBalance,
              transaction_type: 'sovereign_mass_adjust',
              description: reason || `Sovereign mass adjustment: ${percentage}%`
            });

          totalAdjusted += adjustment;
        }

        afterState = { total_adjusted: totalAdjusted, users_affected: profiles.length };
        result = { success: true, ...afterState };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log action to sovereign audit log (except for read-only actions)
    if (action !== 'get_stats' && action !== 'get_ledger') {
      await supabase
        .from('sovereign_audit_log')
        .insert({
          sovereign_id: user.id,
          action_category: 'economy',
          action_type: action,
          target_type: 'profile',
          target_id: target_user_id || from_user_id || 'mass',
          before_state: beforeState,
          after_state: afterState,
          severity: action === 'mass_adjust' ? 'critical' : 'normal',
          notes: notes || reason
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sovereign economy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
