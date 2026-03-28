import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Release Pending Payouts — Daily pg_cron Job
 *
 * Finds all pending_payouts where status='pending' AND scheduled_release_at <= NOW().
 * For each: credits profiles.barber_bucks, marks 'released', logs transaction, notifies barber.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[RELEASE-PAYOUTS] Starting daily payout release...');

    // Get all matured pending payouts
    const { data: payouts, error: fetchError } = await supabase
      .from('pending_payouts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_release_at', new Date().toISOString())
      .limit(500);

    if (fetchError) {
      console.error('[RELEASE-PAYOUTS] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!payouts || payouts.length === 0) {
      console.log('[RELEASE-PAYOUTS] No payouts to release');
      return new Response(
        JSON.stringify({ success: true, released: 0, message: 'No payouts to release' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[RELEASE-PAYOUTS] Found ${payouts.length} payouts to release`);

    let released = 0;
    let failed = 0;

    for (const payout of payouts) {
      try {
        // Get current balance with lock simulation (service role)
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('barber_bucks')
          .eq('user_id', payout.user_id)
          .single();

        if (profileErr || !profile) {
          console.error(`[RELEASE-PAYOUTS] Profile not found for ${payout.user_id}`);
          failed++;
          continue;
        }

        const currentBalance = profile.barber_bucks || 0;
        const newBalance = currentBalance + payout.amount_bb;

        // Credit the barber
        const { error: creditErr } = await supabase
          .from('profiles')
          .update({ barber_bucks: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', payout.user_id);

        if (creditErr) {
          console.error(`[RELEASE-PAYOUTS] Credit error for ${payout.user_id}:`, creditErr);
          failed++;
          continue;
        }

        // Mark payout as released
        await supabase
          .from('pending_payouts')
          .update({ status: 'released', released_at: new Date().toISOString() })
          .eq('id', payout.id);

        // Log transaction
        await supabase.from('barber_bucks_transactions').insert({
          user_id: payout.user_id,
          amount: payout.amount_bb,
          balance_after: newBalance,
          transaction_type: 'payout_released',
          description: `Payout released: ${payout.amount_bb} BB (${payout.payout_type})`,
          reference_id: payout.battle_id || payout.challenge_id,
        });

        // Notify barber
        await supabase.from('notifications').insert({
          user_id: payout.user_id,
          type: 'payout_released',
          title: '🎉 Payout Released!',
          message: `Your ${payout.amount_bb} BB payout has been credited to your wallet!`,
          data: {
            amount_bb: payout.amount_bb,
            payout_type: payout.payout_type,
            battle_id: payout.battle_id,
          },
        });

        released++;
        console.log(`[RELEASE-PAYOUTS] Released ${payout.amount_bb} BB to ${payout.user_id}`);
      } catch (err) {
        console.error(`[RELEASE-PAYOUTS] Error processing payout ${payout.id}:`, err);
        failed++;
      }
    }

    console.log(`[RELEASE-PAYOUTS] Done: ${released} released, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, released, failed, total: payouts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[RELEASE-PAYOUTS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to release payouts' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
