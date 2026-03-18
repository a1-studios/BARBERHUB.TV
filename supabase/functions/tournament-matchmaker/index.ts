import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueEntry {
  id: string;
  user_id: string;
  barber_profile_id: string;
  category: string;
  country_code: string;
  queue_timestamp: string;
}

interface BarberProfile {
  id: string;
  user_id: string;
  name: string;
}

function getNextBattleSunday(): Date {
  const now = new Date();
  const ET_OFFSET = -5;
  const etNow = new Date(now.getTime() + (ET_OFFSET * 60 * 60 * 1000));
  
  let daysUntilSunday = 7 - etNow.getDay();
  if (daysUntilSunday === 7) daysUntilSunday = 0;
  
  const nextSunday = new Date(etNow);
  nextSunday.setDate(etNow.getDate() + daysUntilSunday);
  nextSunday.setHours(10, 0, 0, 0);
  
  if (daysUntilSunday === 0 && etNow.getHours() >= 10) {
    nextSunday.setDate(nextSunday.getDate() + 7);
  }
  
  return new Date(nextSunday.getTime() - (ET_OFFSET * 60 * 60 * 1000));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[MATCHMAKER] Starting tournament matchmaker...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: waitingBarbers, error: queueError } = await supabaseClient
      .from('tournament_queue')
      .select('*')
      .eq('status', 'waiting')
      .order('queue_timestamp', { ascending: true });

    if (queueError) {
      console.error('[MATCHMAKER] Error fetching queue:', queueError);
      throw queueError;
    }

    if (!waitingBarbers || waitingBarbers.length < 2) {
      console.log('[MATCHMAKER] Not enough barbers in queue.');
      return new Response(
        JSON.stringify({ message: 'Not enough barbers in queue', waiting_count: waitingBarbers?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MATCHMAKER] Found ${waitingBarbers.length} waiting barbers`);

    const categoriesMap = new Map<string, QueueEntry[]>();
    waitingBarbers.forEach((barber: QueueEntry) => {
      if (!categoriesMap.has(barber.category)) {
        categoriesMap.set(barber.category, []);
      }
      categoriesMap.get(barber.category)!.push(barber);
    });

    const matches: any[] = [];

    for (const [category, barbers] of categoriesMap.entries()) {
      console.log(`[MATCHMAKER] Processing category: ${category} with ${barbers.length} barbers`);

      if (barbers.length < 2) continue;

      while (barbers.length >= 2) {
        const barber1 = barbers.shift()!;

        const differentCountry = barbers.filter(b => b.country_code !== barber1.country_code);
        const sameCountry = barbers.filter(b => b.country_code === barber1.country_code);

        let barber2: QueueEntry | undefined;
        let barber2Index: number;

        if (differentCountry.length > 0) {
          barber2 = differentCountry[0];
          barber2Index = barbers.indexOf(barber2);
        } else if (sameCountry.length > 0) {
          barber2 = sameCountry[0];
          barber2Index = barbers.indexOf(barber2);
        } else {
          break;
        }

        barbers.splice(barber2Index, 1);

        // FIX: Fetch barber_profiles by ID to get the correct FK values
        const { data: profiles, error: profileError } = await supabaseClient
          .from('barber_profiles')
          .select('id, user_id, name')
          .in('id', [barber1.barber_profile_id, barber2.barber_profile_id]);

        if (profileError) {
          console.error('[MATCHMAKER] Error fetching profiles:', profileError);
          continue;
        }

        const barber1Profile = profiles?.find((p: BarberProfile) => p.id === barber1.barber_profile_id);
        const barber2Profile = profiles?.find((p: BarberProfile) => p.id === barber2.barber_profile_id);

        const battleTime = getNextBattleSunday();
        const votingEndsAt = new Date(battleTime.getTime() + (7 * 24 * 60 * 60 * 1000));
        const submissionDeadline = new Date(battleTime.getTime() + (45 * 60 * 1000));

        // FIX: Use barber_profile_id (not user_id) for barber1_id/barber2_id FK
        const { data: battle, error: battleError } = await supabaseClient
          .from('battles')
          .insert({
            organizer_id: barber1.user_id,
            barber1_id: barber1.barber_profile_id,
            barber2_id: barber2.barber_profile_id,
            category: category,
            title: `${category} Tournament Match`,
            description: `Tournament match between ${barber1Profile?.name || 'Barber 1'} (${barber1.country_code}) and ${barber2Profile?.name || 'Barber 2'} (${barber2.country_code})`,
            status: 'upcoming',
            starts_at: battleTime.toISOString(),
            submission_deadline: submissionDeadline.toISOString(),
            voting_ends_at: votingEndsAt.toISOString(),
            is_tournament_match: true,
            prize_amount: 0,
            currency: 'USD'
          })
          .select()
          .single();

        if (battleError) {
          console.error('[MATCHMAKER] Error creating battle:', battleError);
          continue;
        }

        console.log(`[MATCHMAKER] Created battle ${battle.id} for ${category}`);

        await supabaseClient
          .from('tournament_queue')
          .update({ status: 'matched', matched_battle_id: battle.id })
          .in('id', [barber1.id, barber2.id]);

        await Promise.all([
          supabaseClient.from('notifications').insert({
            user_id: barber1.user_id,
            type: 'battle_match',
            title: '🎯 Opponent Found!',
            message: `You've been matched with ${barber2Profile?.name || 'your opponent'} from ${barber2.country_code}!`,
            data: { battle_id: battle.id, opponent_id: barber2.user_id }
          }),
          supabaseClient.from('notifications').insert({
            user_id: barber2.user_id,
            type: 'battle_match',
            title: '🎯 Opponent Found!',
            message: `You've been matched with ${barber1Profile?.name || 'your opponent'} from ${barber1.country_code}!`,
            data: { battle_id: battle.id, opponent_id: barber1.user_id }
          })
        ]);

        matches.push({
          battle_id: battle.id,
          category,
          barber1: { id: barber1.barber_profile_id, user_id: barber1.user_id, country: barber1.country_code },
          barber2: { id: barber2.barber_profile_id, user_id: barber2.user_id, country: barber2.country_code },
          scheduled_time: battleTime.toISOString()
        });
      }
    }

    console.log(`[MATCHMAKER] Completed. Created ${matches.length} matches`);

    return new Response(
      JSON.stringify({ success: true, matches_created: matches.length, matches }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[MATCHMAKER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
