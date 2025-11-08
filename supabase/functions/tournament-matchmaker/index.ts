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
  user_id: string;
  name: string;
}

/**
 * Calculate next "Battle Sunday" at 10 AM ET
 * Battles are scheduled every hour from 10 AM - 6 PM ET on Sundays
 */
function getNextBattleSunday(): Date {
  const now = new Date();
  const ET_OFFSET = -5; // EST offset (adjust to -4 for EDT if needed)
  
  // Convert to ET
  const etNow = new Date(now.getTime() + (ET_OFFSET * 60 * 60 * 1000));
  
  // Find next Sunday
  let daysUntilSunday = 7 - etNow.getDay();
  if (daysUntilSunday === 7) daysUntilSunday = 0; // If today is Sunday
  
  const nextSunday = new Date(etNow);
  nextSunday.setDate(etNow.getDate() + daysUntilSunday);
  nextSunday.setHours(10, 0, 0, 0); // 10 AM ET
  
  // If it's already past 10 AM on Sunday, schedule for next Sunday
  if (daysUntilSunday === 0 && etNow.getHours() >= 10) {
    nextSunday.setDate(nextSunday.getDate() + 7);
  }
  
  // Convert back to UTC
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

    // Step 1: Get all waiting barbers grouped by category
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
      console.log('[MATCHMAKER] Not enough barbers in queue. Need at least 2.');
      return new Response(
        JSON.stringify({ 
          message: 'Not enough barbers in queue',
          waiting_count: waitingBarbers?.length || 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MATCHMAKER] Found ${waitingBarbers.length} waiting barbers`);

    // Group by category
    const categoriesMap = new Map<string, QueueEntry[]>();
    waitingBarbers.forEach((barber: QueueEntry) => {
      if (!categoriesMap.has(barber.category)) {
        categoriesMap.set(barber.category, []);
      }
      categoriesMap.get(barber.category)!.push(barber);
    });

    const matches: any[] = [];

    // Step 2: Process each category
    for (const [category, barbers] of categoriesMap.entries()) {
      console.log(`[MATCHMAKER] Processing category: ${category} with ${barbers.length} barbers`);

      if (barbers.length < 2) {
        console.log(`[MATCHMAKER] Skipping ${category} - not enough barbers`);
        continue;
      }

      // Process barbers in order until we can't make more matches
      while (barbers.length >= 2) {
        const barber1 = barbers.shift()!; // Get oldest barber

        // Step 3: Apply International Rivalry Logic
        // Priority 1: Different country (oldest first)
        // Priority 2: Same country (oldest first)
        const differentCountry = barbers.filter(b => b.country_code !== barber1.country_code);
        const sameCountry = barbers.filter(b => b.country_code === barber1.country_code);

        let barber2: QueueEntry | undefined;
        let barber2Index: number;

        if (differentCountry.length > 0) {
          // Prefer international match
          barber2 = differentCountry[0];
          barber2Index = barbers.indexOf(barber2);
          console.log(`[MATCHMAKER] International match: ${barber1.country_code} vs ${barber2.country_code}`);
        } else if (sameCountry.length > 0) {
          // Fallback to same country
          barber2 = sameCountry[0];
          barber2Index = barbers.indexOf(barber2);
          console.log(`[MATCHMAKER] Domestic match: ${barber1.country_code} vs ${barber2.country_code}`);
        } else {
          console.log('[MATCHMAKER] No valid opponent found');
          break;
        }

        // Remove barber2 from queue
        barbers.splice(barber2Index, 1);

        // Step 4: Get barber profiles for names
        const { data: profiles, error: profileError } = await supabaseClient
          .from('barber_profiles')
          .select('user_id, name')
          .in('id', [barber1.barber_profile_id, barber2.barber_profile_id]);

        if (profileError) {
          console.error('[MATCHMAKER] Error fetching profiles:', profileError);
          continue;
        }

        const barber1Profile = profiles?.find((p: BarberProfile) => p.user_id === barber1.user_id);
        const barber2Profile = profiles?.find((p: BarberProfile) => p.user_id === barber2.user_id);

        // Step 5: Calculate next available Sunday slot
        const battleTime = getNextBattleSunday();
        const votingEndsAt = new Date(battleTime.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days later
        const submissionDeadline = new Date(battleTime.getTime() + (45 * 60 * 1000)); // 45 minutes after start

        // Step 6: Create battle
        const { data: battle, error: battleError } = await supabaseClient
          .from('battles')
          .insert({
            organizer_id: barber1.user_id,
            barber1_id: barber1.user_id,
            barber2_id: barber2.user_id,
            category: category,
            title: `${category} Tournament Match`,
            description: `Tournament match between ${barber1Profile?.name || 'Barber 1'} (${barber1.country_code}) and ${barber2Profile?.name || 'Barber 2'} (${barber2.country_code})`,
            status: 'upcoming',
            starts_at: battleTime.toISOString(),
            submission_deadline: submissionDeadline.toISOString(),
            voting_ends_at: votingEndsAt.toISOString(),
            is_tournament_match: true,
            prize_amount: 0, // TBD
            currency: 'USD'
          })
          .select()
          .single();

        if (battleError) {
          console.error('[MATCHMAKER] Error creating battle:', battleError);
          continue;
        }

        console.log(`[MATCHMAKER] Created battle ${battle.id} for ${category}`);

        // Step 7: Update queue entries to 'matched'
        const { error: updateError } = await supabaseClient
          .from('tournament_queue')
          .update({ 
            status: 'matched',
            matched_battle_id: battle.id
          })
          .in('id', [barber1.id, barber2.id]);

        if (updateError) {
          console.error('[MATCHMAKER] Error updating queue:', updateError);
        }

        // Step 8: Create notifications
        await Promise.all([
          supabaseClient.from('notifications').insert({
            user_id: barber1.user_id,
            type: 'battle_match',
            title: '🎯 Opponent Found!',
            message: `You've been matched with ${barber2Profile?.name || 'your opponent'} from ${barber2.country_code}! Battle starts ${battleTime.toLocaleDateString()} at 10 AM ET.`,
            data: { battle_id: battle.id, opponent_id: barber2.user_id }
          }),
          supabaseClient.from('notifications').insert({
            user_id: barber2.user_id,
            type: 'battle_match',
            title: '🎯 Opponent Found!',
            message: `You've been matched with ${barber1Profile?.name || 'your opponent'} from ${barber1.country_code}! Battle starts ${battleTime.toLocaleDateString()} at 10 AM ET.`,
            data: { battle_id: battle.id, opponent_id: barber1.user_id }
          })
        ]);

        matches.push({
          battle_id: battle.id,
          category,
          barber1: { id: barber1.user_id, country: barber1.country_code },
          barber2: { id: barber2.user_id, country: barber2.country_code },
          scheduled_time: battleTime.toISOString()
        });
      }
    }

    console.log(`[MATCHMAKER] Completed. Created ${matches.length} matches`);

    return new Response(
      JSON.stringify({ 
        success: true,
        matches_created: matches.length,
        matches
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[MATCHMAKER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
