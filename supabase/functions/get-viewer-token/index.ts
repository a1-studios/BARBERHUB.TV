import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetViewerTokenRequest {
  battleId: string;
  roomName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[GET-VIEWER-TOKEN] Function started');

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET');

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
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
      console.error('[GET-VIEWER-TOKEN] Auth failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { battleId, roomName }: GetViewerTokenRequest = await req.json();

    if (!battleId || !roomName) {
      throw new Error('battleId and roomName are required');
    }

    // Verify battle exists
    const { data: battle, error: battleError } = await supabaseClient
      .from('battles')
      .select('id, status, streaming_type')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      throw new Error('Battle not found');
    }

    if (battle.streaming_type !== 'twilio') {
      throw new Error('This battle does not use Twilio streaming');
    }

    // Get user profile for display name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', user.id)
      .single();

    const displayName = profile?.display_name || profile?.username || 'Viewer';

    // Generate viewer token (subscribe-only, no publish)
    const token = await generateViewerToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      user.id,
      displayName,
      roomName
    );

    // Update viewer count
    await supabaseClient
      .from('stream_sessions')
      .update({ 
        total_views: supabaseClient.rpc('increment', { x: 1 }) 
      })
      .eq('battle_id', battleId)
      .eq('status', 'live');

    console.log('[GET-VIEWER-TOKEN] Token generated for viewer:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        roomName,
        identity: user.id,
        displayName,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[GET-VIEWER-TOKEN] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Generate Twilio Access Token for viewers (subscribe-only)
async function generateViewerToken(
  accountSid: string,
  apiKey: string,
  apiSecret: string,
  identity: string,
  friendlyName: string,
  roomName: string
): Promise<string> {
  const header = {
    typ: 'JWT',
    alg: 'HS256',
    cty: 'twilio-fpa;v=1',
  };

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
