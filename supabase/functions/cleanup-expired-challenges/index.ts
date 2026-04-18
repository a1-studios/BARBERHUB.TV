import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const nowIso = new Date().toISOString();

    // ─── 1) Hard-delete MATCHED challenges older than 60s (Quick Play cleanup) ───
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: matchedOld } = await supabase
      .from('open_challenges')
      .select('id, challenger_id, accepted_by_id')
      .eq('status', 'matched')
      .lt('accepted_at', sixtySecondsAgo);

    if (matchedOld && matchedOld.length > 0) {
      const ids = matchedOld.map(r => r.id);
      // Soft-dismiss orphan notifications for both parties
      const userIds = Array.from(new Set(matchedOld.flatMap(r => [r.challenger_id, r.accepted_by_id].filter(Boolean))));
      if (userIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true, dismissed_at: nowIso })
          .in('user_id', userIds as string[])
          .in('type', ['challenge_received', 'challenge_sent'])
          .filter('data->>challenge_id', 'in', `(${ids.join(',')})`);
      }
      await supabase.from('open_challenges').delete().in('id', ids);
      console.log(`Hard-deleted ${ids.length} matched Quick Play challenges`);
    }

    // ─── 2) Find all expired challenges still waiting (refund path) ───
    const { data: expired, error: fetchError } = await supabase
      .from('open_challenges')
      .select('id, challenger_id, stake_amount, title')
      .eq('status', 'waiting_for_opponent')
      .lt('expires_at', nowIso);

    if (fetchError) {
      console.error('Fetch expired error:', fetchError);
      throw new Error('Failed to fetch expired challenges');
    }

    if (!expired || expired.length === 0) {
      return new Response(
        JSON.stringify({ success: true, cleaned: 0, message: 'No expired challenges found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expired.length} expired challenges to clean up`);

    let cleaned = 0;
    const errors: string[] = [];

    for (const challenge of expired) {
      try {
        const stakeAmount = challenge.stake_amount || 0;

        if (stakeAmount > 0) {
          // Get current balance
          const { data: profile } = await supabase
            .from('profiles')
            .select('barber_bucks')
            .eq('user_id', challenge.challenger_id)
            .single();

          const currentBalance = profile?.barber_bucks || 0;
          const newBalance = currentBalance + stakeAmount;

          // Refund stake
          const { error: refundError } = await supabase
            .from('profiles')
            .update({ barber_bucks: newBalance })
            .eq('user_id', challenge.challenger_id);

          if (refundError) {
            console.error(`Refund error for ${challenge.id}:`, refundError);
            errors.push(`Refund failed for ${challenge.id}`);
            continue;
          }

          // Record refund transaction
          await supabase
            .from('barber_bucks_transactions')
            .insert({
              user_id: challenge.challenger_id,
              amount: stakeAmount,
              balance_after: newBalance,
              transaction_type: 'challenge_stake_refund',
              description: `Challenge expired, stake refunded: "${challenge.title}"`,
            });
        }

        // Mark challenge as expired
        const { error: updateError } = await supabase
          .from('open_challenges')
          .update({ status: 'expired' })
          .eq('id', challenge.id);

        if (updateError) {
          console.error(`Status update error for ${challenge.id}:`, updateError);
          errors.push(`Status update failed for ${challenge.id}`);
          continue;
        }

        // Soft-dismiss any lingering challenge notifications tied to this row
        await supabase
          .from('notifications')
          .update({ read: true, dismissed_at: nowIso })
          .eq('user_id', challenge.challenger_id)
          .in('type', ['challenge_received', 'challenge_sent'])
          .filter('data->>challenge_id', 'eq', challenge.id);

        cleaned++;
        console.log(`Cleaned challenge ${challenge.id}: refunded ${stakeAmount} BB to ${challenge.challenger_id}`);
      } catch (err) {
        console.error(`Error processing challenge ${challenge.id}:`, err);
        errors.push(`Processing failed for ${challenge.id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cleaned,
        total_expired: expired.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Cleaned ${cleaned}/${expired.length} expired challenges`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Cleanup failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
