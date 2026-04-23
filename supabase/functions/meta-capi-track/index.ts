// Meta Conversions API mirror — receives client-side events and posts them to
// Meta server-side with hashed PII for iOS 14+ recovery and dedup.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CapiBody {
  event_name: string;
  event_id: string;
  email?: string;
  country?: string;
  user_type?: 'fan' | 'barber';
  source_url?: string;
  fbp?: string;
  fbc?: string;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function badRequest(message: string, fields?: Record<string, string[]>) {
  return new Response(
    JSON.stringify({ success: false, error: message, fields }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const datasetId = Deno.env.get('barberhub_meta_data');
    const accessToken = Deno.env.get('META_ACCESS_TOKEN');

    if (!datasetId || !accessToken) {
      console.error('[meta-capi-track] missing secrets', {
        hasDataset: !!datasetId,
        hasToken: !!accessToken,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Server not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json().catch(() => null)) as CapiBody | null;
    if (!body) return badRequest('Invalid JSON body');

    // --- Manual validation (avoid extra deps) ---
    const errors: Record<string, string[]> = {};
    const allowedEvents = ['Lead', 'CompleteRegistration', 'PageView', 'ViewContent'];
    if (!body.event_name || !allowedEvents.includes(body.event_name)) {
      errors.event_name = ['Must be one of: ' + allowedEvents.join(', ')];
    }
    if (!body.event_id || typeof body.event_id !== 'string' || body.event_id.length < 8) {
      errors.event_id = ['Required UUID'];
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.email = ['Invalid email format'];
    }
    if (body.country && !/^[A-Za-z]{2}$/.test(body.country)) {
      errors.country = ['Must be ISO-2 country code'];
    }
    if (body.user_type && !['fan', 'barber'].includes(body.user_type)) {
      errors.user_type = ['Must be fan or barber'];
    }
    if (Object.keys(errors).length > 0) {
      return badRequest('Validation failed', errors);
    }

    // --- Build user_data with hashed PII per Meta spec ---
    const userData: Record<string, unknown> = {};

    if (body.email) {
      const normalized = body.email.trim().toLowerCase();
      userData.em = [await sha256Hex(normalized)];
    }
    if (body.country) {
      const normalized = body.country.trim().toLowerCase();
      userData.country = [await sha256Hex(normalized)];
    }
    if (body.fbp) userData.fbp = body.fbp;
    if (body.fbc) userData.fbc = body.fbc;

    // --- Build custom_data (clear values for audience targeting) ---
    const customData: Record<string, unknown> = {};
    if (body.user_type) customData.user_role = body.user_type;
    if (body.country) customData.country = body.country.toUpperCase();

    // --- Assemble Meta event payload ---
    const event = {
      event_name: body.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.event_id,
      event_source_url: body.source_url ?? 'https://barberhub.tv',
      action_source: 'website',
      user_data: userData,
      custom_data: customData,
    };

    const url = `https://graph.facebook.com/v19.0/${datasetId}/events`;
    const fbResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [event],
        access_token: accessToken,
      }),
    });

    const fbJson = await fbResp.json().catch(() => ({}));

    if (!fbResp.ok) {
      console.error('[meta-capi-track] Meta returned error', fbJson);
      return new Response(
        JSON.stringify({ success: false, error: 'Meta CAPI error', details: fbJson }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        events_received: fbJson.events_received ?? 1,
        event_id: body.event_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[meta-capi-track] uncaught', err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
