import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EndStreamRequest {
  battleId: string;
  barberPosition: 1 | 2;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[END-TWILIO-STREAM] Function started');

    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET');

    if (!twilioApiKey || !twilioApiSecret) {
      throw new Error('Twilio credentials not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[END-TWILIO-STREAM] User authenticated:', user.id);

    const { battleId, barberPosition }: EndStreamRequest = await req.json();

    // Get battle and verify ownership
    const { data: battle, error: battleError } = await supabaseClient
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      throw new Error('Battle not found');
    }

    // Get barber profile
    const { data: barberProfile } = await supabaseClient
      .from('barber_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!barberProfile) {
      throw new Error('Barber profile not found');
    }

    // Verify user is the correct barber
    const barberIdField = barberPosition === 1 ? 'barber1_id' : 'barber2_id';
    if (battle[barberIdField] !== barberProfile.id) {
      throw new Error('You are not authorized to end this stream');
    }

    const roomName = `battle-${battleId}-barber${barberPosition}`;
    const twilioAuth = btoa(`${twilioApiKey}:${twilioApiSecret}`);

    // End the Twilio room
    const endRoomResponse = await fetch(
      `https://video.twilio.com/v1/Rooms/${encodeURIComponent(roomName)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          Status: 'completed',
        }),
      }
    );

    if (!endRoomResponse.ok && endRoomResponse.status !== 404) {
      console.error('[END-TWILIO-STREAM] Failed to end room:', await endRoomResponse.text());
    }

    // Update stream session
    const { data: session } = await supabaseClient
      .from('stream_sessions')
      .select('*')
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .eq('status', 'live')
      .single();

    if (session) {
      const durationSeconds = Math.floor(
        (Date.now() - new Date(session.started_at).getTime()) / 1000
      );

      await supabaseClient
        .from('stream_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', session.id);

      // Update barber stats
      await supabaseClient
        .from('barber_profiles')
        .update({
          total_streams: barberProfile.total_streams + 1,
          total_stream_minutes: (barberProfile.total_stream_minutes || 0) + Math.floor(durationSeconds / 60),
        })
        .eq('id', barberProfile.id);
    }

    // Update battle status
    const updateData: Record<string, any> = {};
    if (barberPosition === 1) {
      updateData.barber1_is_streaming = false;
      updateData.barber1_stream_sid = null;
    } else {
      updateData.barber2_is_streaming = false;
      updateData.barber2_stream_sid = null;
    }

    await supabaseClient
      .from('battles')
      .update(updateData)
      .eq('id', battleId);

    console.log('[END-TWILIO-STREAM] Stream ended successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stream ended successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[END-TWILIO-STREAM] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
