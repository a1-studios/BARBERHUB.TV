// Send SMS OTP via Twilio gateway. Stores hashed code in phone_otp_codes.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

const E164_RE = /^\+[1-9]\d{6,14}$/;
const RESEND_COOLDOWN_SEC = 60;
const HOURLY_CAP = 5;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY_1') ?? Deno.env.get('TWILIO_API_KEY');
    const TWILIO_FROM = Deno.env.get('TWILIO_FROM_NUMBER'); // E.164 sender
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');
    if (!TWILIO_API_KEY) throw new Error('TWILIO_API_KEY missing — connect the Twilio connector');
    if (!TWILIO_FROM) throw new Error('TWILIO_FROM_NUMBER secret missing');

    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone ?? '').trim();
    if (!E164_RE.test(phone)) {
      return new Response(JSON.stringify({ error: 'Invalid E.164 phone' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Rate-limit: per-phone cooldown + hourly cap
    const { data: existing } = await admin
      .from('phone_otp_codes')
      .select('last_sent_at')
      .eq('phone', phone)
      .maybeSingle();

    if (existing?.last_sent_at) {
      const ageSec = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000;
      if (ageSec < RESEND_COOLDOWN_SEC) {
        return new Response(JSON.stringify({ error: `Wait ${Math.ceil(RESEND_COOLDOWN_SEC - ageSec)}s` }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recent } = await admin
      .from('phone_otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('last_sent_at', oneHourAgo);
    if ((recent ?? 0) >= HOURLY_CAP) {
      return new Response(JSON.stringify({ error: 'Hourly limit reached. Try later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: upsertErr } = await admin
      .from('phone_otp_codes')
      .upsert(
        { phone, code_hash: codeHash, attempts: 0, expires_at: expiresAt, last_sent_at: new Date().toISOString() },
        { onConflict: 'phone' },
      );
    if (upsertErr) throw upsertErr;

    const smsBody = `Your Barber-Hub code is ${code}. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`;

    const twilioRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: TWILIO_FROM, Body: smsBody }),
    });

    if (!twilioRes.ok) {
      const txt = await twilioRes.text();
      console.error('Twilio send failed', twilioRes.status, txt);
      return new Response(JSON.stringify({ error: 'SMS send failed', detail: txt }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('send-sms-otp error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
