import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleMatchRequest {
  tournamentId: string;
  phaseId: string;
  barber1Id: string;
  barber2Id: string;
  roundNumber: number;
  matchNumber: number;
  scheduledAt: string;
  youtubeStreamUrl?: string;
  title?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SCHEDULE-MATCH] Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('[SCHEDULE-MATCH] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SCHEDULE-MATCH] User authenticated:', user.id);

    const {
      tournamentId,
      phaseId,
      barber1Id,
      barber2Id,
      roundNumber,
      matchNumber,
      scheduledAt,
      youtubeStreamUrl,
      title,
    }: ScheduleMatchRequest = await req.json();

    console.log('[SCHEDULE-MATCH] Creating battle:', {
      tournamentId,
      phaseId,
      barber1Id,
      barber2Id,
    });

    // Create battle record
    const { data: battle, error: battleError } = await supabaseClient
      .from('battles')
      .insert({
        tournament_id: tournamentId,
        phase_id: phaseId,
        barber1_id: barber1Id,
        barber2_id: barber2Id,
        round_number: roundNumber,
        match_number: matchNumber,
        is_tournament_match: true,
        organizer_id: user.id,
        title: title || `Tournament Match ${matchNumber}`,
        status: 'upcoming',
        starts_at: scheduledAt,
        youtube_stream_url: youtubeStreamUrl,
      })
      .select()
      .single();

    if (battleError) {
      console.error('[SCHEDULE-MATCH] Battle creation failed:', battleError);
      throw battleError;
    }

    console.log('[SCHEDULE-MATCH] Battle created:', battle.id);

    // Update bracket match with battle reference
    const { error: bracketError } = await supabaseClient
      .from('bracket_matches')
      .update({
        battle_id: battle.id,
        scheduled_at: scheduledAt,
        youtube_stream_url: youtubeStreamUrl,
      })
      .eq('tournament_id', tournamentId)
      .eq('phase_id', phaseId)
      .eq('round_number', roundNumber)
      .eq('match_number', matchNumber);

    if (bracketError) {
      console.error('[SCHEDULE-MATCH] Bracket update failed:', bracketError);
    }

    console.log('[SCHEDULE-MATCH] Match scheduled successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        battleId: battle.id,
        message: 'Tournament match scheduled successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[SCHEDULE-MATCH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
