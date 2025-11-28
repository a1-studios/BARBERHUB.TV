import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateRoomRequest {
  battleId: string;
  barberPosition: 1 | 2; // Which barber slot (1 or 2)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-TWILIO-ROOM] Function started');

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET');

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
      console.error('[CREATE-TWILIO-ROOM] Missing Twilio credentials');
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
      console.error('[CREATE-TWILIO-ROOM] Auth failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-TWILIO-ROOM] User authenticated:', user.id);

    const { battleId, barberPosition }: CreateRoomRequest = await req.json();

    if (!battleId || !barberPosition) {
      throw new Error('battleId and barberPosition are required');
    }

    // Verify user is a barber with active subscription
    const { data: barberProfile, error: barberError } = await supabaseClient
      .from('barber_profiles')
      .select('id, name, can_stream, active_subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (barberError || !barberProfile) {
      console.error('[CREATE-TWILIO-ROOM] Barber profile not found:', barberError);
      throw new Error('Barber profile not found. Only barbers can stream.');
    }

    if (!barberProfile.can_stream) {
      throw new Error('Streaming is disabled for your account');
    }

    // Verify battle exists and user is a participant
    const { data: battle, error: battleError } = await supabaseClient
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      console.error('[CREATE-TWILIO-ROOM] Battle not found:', battleError);
      throw new Error('Battle not found');
    }

    // Verify user is the correct barber for this position
    const barberIdField = barberPosition === 1 ? 'barber1_id' : 'barber2_id';
    if (battle[barberIdField] !== barberProfile.id) {
      throw new Error(`You are not barber ${barberPosition} in this battle`);
    }

    // Check if already streaming
    const isStreamingField = barberPosition === 1 ? 'barber1_is_streaming' : 'barber2_is_streaming';
    if (battle[isStreamingField]) {
      throw new Error('You are already streaming in this battle');
    }

    // Create unique room name
    const roomName = `battle-${battleId}-barber${barberPosition}`;

    console.log('[CREATE-TWILIO-ROOM] Creating room:', roomName);

    // Create Twilio Video Room via REST API
    const twilioAuth = btoa(`${twilioApiKey}:${twilioApiSecret}`);
    
    const createRoomResponse = await fetch(
      `https://video.twilio.com/v1/Rooms`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          UniqueName: roomName,
          Type: 'group', // Supports up to 50 participants
          RecordParticipantsOnConnect: 'true',
          MaxParticipants: '50',
          StatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-webhook`,
        }),
      }
    );

    let roomSid: string;
    
    if (createRoomResponse.status === 201) {
      const roomData = await createRoomResponse.json();
      roomSid = roomData.sid;
      console.log('[CREATE-TWILIO-ROOM] Room created:', roomSid);
    } else if (createRoomResponse.status === 400) {
      // Room might already exist, try to fetch it
      const fetchRoomResponse = await fetch(
        `https://video.twilio.com/v1/Rooms/${encodeURIComponent(roomName)}`,
        {
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
          },
        }
      );
      
      if (fetchRoomResponse.ok) {
        const roomData = await fetchRoomResponse.json();
        roomSid = roomData.sid;
        console.log('[CREATE-TWILIO-ROOM] Existing room found:', roomSid);
      } else {
        const errorText = await createRoomResponse.text();
        console.error('[CREATE-TWILIO-ROOM] Failed to create room:', errorText);
        throw new Error('Failed to create streaming room');
      }
    } else {
      const errorText = await createRoomResponse.text();
      console.error('[CREATE-TWILIO-ROOM] Twilio API error:', errorText);
      throw new Error('Failed to create streaming room');
    }

    // Generate Access Token for the barber
    const token = await generateTwilioToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      user.id,
      barberProfile.name || 'Barber',
      roomName
    );

    // Create stream session record
    const { data: session, error: sessionError } = await supabaseClient
      .from('stream_sessions')
      .insert({
        battle_id: battleId,
        barber_id: barberProfile.id,
        user_id: user.id,
        room_sid: roomSid,
        status: 'connecting',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[CREATE-TWILIO-ROOM] Session creation failed:', sessionError);
    }

    // Update battle with room info
    const updateData: Record<string, any> = {
      streaming_type: 'twilio',
    };
    
    if (barberPosition === 1) {
      updateData.barber1_stream_sid = roomSid;
    } else {
      updateData.barber2_stream_sid = roomSid;
    }

    if (!battle.twilio_room_sid) {
      updateData.twilio_room_sid = roomSid;
    }

    await supabaseClient
      .from('battles')
      .update(updateData)
      .eq('id', battleId);

    console.log('[CREATE-TWILIO-ROOM] Success, returning token');

    return new Response(
      JSON.stringify({
        success: true,
        token,
        roomName,
        roomSid,
        sessionId: session?.id,
        identity: user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[CREATE-TWILIO-ROOM] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Generate Twilio Access Token
async function generateTwilioToken(
  accountSid: string,
  apiKey: string,
  apiSecret: string,
  identity: string,
  friendlyName: string,
  roomName: string
): Promise<string> {
  // JWT Header
  const header = {
    typ: 'JWT',
    alg: 'HS256',
    cty: 'twilio-fpa;v=1',
  };

  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    jti: `${apiKey}-${now}`,
    iss: apiKey,
    sub: accountSid,
    iat: now,
    exp: now + 14400, // 4 hours
    grants: {
      identity: identity,
      video: {
        room: roomName,
      },
    },
  };

  // Encode and sign
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signatureInput)
  );
  
  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
