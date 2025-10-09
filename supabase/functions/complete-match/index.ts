import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteMatchRequest {
  battleId: string;
  votingDurationMinutes?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[COMPLETE-MATCH] Function started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('[COMPLETE-MATCH] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[COMPLETE-MATCH] User authenticated:', user.id);

    const { battleId, votingDurationMinutes = 30 }: CompleteMatchRequest = await req.json();

    const now = new Date();
    const votingEndsAt = new Date(now.getTime() + votingDurationMinutes * 60000);

    console.log('[COMPLETE-MATCH] Ending stream and starting voting:', {
      battleId,
      votingEndsAt: votingEndsAt.toISOString(),
    });

    // Update battle: mark stream ended, start voting period
    const { error: battleError } = await supabaseClient
      .from('battles')
      .update({
        ends_at: now.toISOString(),
        voting_ends_at: votingEndsAt.toISOString(),
        status: 'voting',
      })
      .eq('id', battleId);

    if (battleError) {
      console.error('[COMPLETE-MATCH] Battle update failed:', battleError);
      throw battleError;
    }

    console.log('[COMPLETE-MATCH] Match completed, voting period started');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Match completed, voting period started',
        votingEndsAt: votingEndsAt.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[COMPLETE-MATCH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
