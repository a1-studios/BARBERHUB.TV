import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * end-live-challenge
 *
 * Closes a Quick Play live challenge:
 *  1. Marks the battle status='completed' and stamps ends_at.
 *  2. Invokes distribute-pot in quick_play mode → it tallies live_challenge_votes,
 *     picks the winner (or draw), pays out, and wipes the ephemeral votes.
 *  3. Returns a small summary the UI can show before redirecting to /watch.
 *
 * Anyone can call this; only the two contenders or the organizer are allowed
 * to actually close the battle (others get 403). Auto-call from the 15-min
 * onTimeUp passes the same auth header (any participant) — viewers cannot
 * end someone else's stream.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { battle_id } = await req.json();
    if (!battle_id) throw new Error('battle_id is required');

    // Load battle + barber profiles to authorize and get user_ids
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('id, organizer_id, status, match_mode, barber1_id, barber2_id')
      .eq('id', battle_id)
      .single();

    if (battleError || !battle) throw new Error('Battle not found');

    if (battle.status === 'completed') {
      return new Response(
        JSON.stringify({ success: true, already_completed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Resolve participating barbers' user_ids for authorization
    const barberIds = [battle.barber1_id, battle.barber2_id].filter(Boolean) as string[];
    let participantUserIds: string[] = [];
    if (barberIds.length > 0) {
      const { data: barbers } = await supabase
        .from('barber_profiles')
        .select('id, user_id')
        .in('id', barberIds);
      participantUserIds = (barbers || []).map(b => b.user_id);
    }

    const isParticipant =
      user.id === battle.organizer_id || participantUserIds.includes(user.id);

    if (!isParticipant) {
      return new Response(
        JSON.stringify({ error: 'Only contenders or the organizer can end this challenge' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Mark battle ended
    await supabase
      .from('battles')
      .update({ status: 'completed', ends_at: new Date().toISOString() })
      .eq('id', battle_id);

    // Forward auth so distribute-pot runs as the same user
    const { data: payout, error: payoutError } = await supabase.functions.invoke('distribute-pot', {
      body: { battle_id, match_mode: 'quick_play' },
      headers: { Authorization: authHeader },
    });

    if (payoutError) {
      console.error('distribute-pot failed:', payoutError);
    }

    return new Response(
      JSON.stringify({ success: true, payout: payout ?? null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to end live challenge';
    console.error('end-live-challenge error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
