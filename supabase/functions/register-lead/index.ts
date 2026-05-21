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
  country_code: z.string().min(2).max(3).optional().nullable(),
  phone_number: z.string().max(40).optional().nullable(),
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

    const { email, fingerprint, source_url, country_code, phone_number } = parsed.data;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Note: we deliberately allow re-registration. If a raffle ticket already
    // exists for this email, claim-raffle-ticket will return the existing one.
    // This keeps the pre-auth funnel friction-free even on retries.
    const { data: existing } = await supabase
      .from('raffle_entries')
      .select('ticket_code')
      .ilike('email', email)
      .maybeSingle();

    const upsert: Record<string, unknown> = {
      email,
      // role left null — set by submit-role-details (email flow)
      // or finalize-oauth-claim (OAuth flow, post sign-in)
      device_fingerprint: fingerprint ?? null,
      source_url: source_url ?? null,
      spin_eligible: true, // OAuth flow goes straight to spin
    };
    if (country_code) upsert.country_code = country_code;
    if (phone_number) upsert.phone_number = phone_number;

    await supabase.from('marketing_leads').upsert(upsert, { onConflict: 'email' });

    return new Response(
      JSON.stringify({ ok: true, already: !!existing, lead_token: btoa(`${email}|${Date.now()}`) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
