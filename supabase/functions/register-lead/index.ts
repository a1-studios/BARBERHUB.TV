import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  fingerprint: z.string().max(128).optional(),
  source_url: z.string().max(2048).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, fingerprint, source_url } = parsed.data;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Refuse if this email already has a raffle ticket
    const { data: existing } = await supabase
      .from('raffle_entries')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'already_entered', message: 'This email already has a raffle ticket.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('marketing_leads').upsert(
      {
        email,
        role: 'fan', // placeholder; will be overwritten in submit-role-details
        device_fingerprint: fingerprint ?? null,
        source_url: source_url ?? null,
        spin_eligible: false,
      },
      { onConflict: 'email' }
    );

    // Stateless lead token (signed JWT-lite via shared secret would be heavier — we keep it simple
    // and just echo the email; the spin endpoint enforces the same gates server-side).
    return new Response(
      JSON.stringify({ ok: true, lead_token: btoa(`${email}|${Date.now()}`) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
