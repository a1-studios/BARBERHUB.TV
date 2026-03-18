import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * donate-to-battle — NOW delegates to the atomic `process_battle_donation` RPC
 * which enforces the 80/15/5 split and FOR UPDATE row locks.
 * This edge function is kept as a thin wrapper for any external callers.
 */
interface DonationRequest {
  battle_id: string;
  barber_id: string;
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

    if (!battle_id || !barber_id || !amount_bb) {
      throw new Error('Missing required fields: battle_id, barber_id, amount_bb');
    }

    console.log(`[DONATE-TO-BATTLE] Delegating to process_battle_donation RPC: ${amount_bb} BB`);

    // Delegate entirely to the atomic RPC which handles:
    // - FOR UPDATE row locks (no race conditions)
    // - 80/15/5 split (category pool / barber wallet / M4M fund)
    // - Transaction logging for donor and barber
    // - battle_donations record
    const { data, error } = await supabase.rpc('process_battle_donation', {
      p_battle_id: battle_id,
      p_donor_id: user.id,
      p_barber_id: barber_id,
      p_amount_bb: amount_bb,
      p_message: message?.substring(0, 200) || null,
    });

    if (error) {
      console.error('[DONATE-TO-BATTLE] RPC error:', error);
      throw new Error(error.message);
    }

    console.log('[DONATE-TO-BATTLE] Success:', data);

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[DONATE-TO-BATTLE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process donation' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
