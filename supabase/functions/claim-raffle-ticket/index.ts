import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const Body = z.object({
  email: z.string().trim().toLowerCase().email(),
  fingerprint: z.string().max(128).optional(),
});

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1
function newCode(): string {
  let c = 'BH-';
  for (let i = 0; i < 4; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}

function nextSunday(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0 = Sunday
  const offset = day === 0 ? 7 : 7 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

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
    const { email, fingerprint } = parsed.data;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify lead is spin-eligible
    const { data: lead } = await supabase
      .from('marketing_leads')
      .select('email, role, country_code, zip_code, barber_status, specialties, spin_eligible')
      .ilike('email', email)
      .maybeSingle();

    if (!lead || !lead.spin_eligible) {
      return new Response(
        JSON.stringify({ error: 'not_eligible', message: 'Complete the previous steps first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refuse duplicate tickets
    const { data: existing } = await supabase
      .from('raffle_entries')
      .select('ticket_code, bb_awarded')
      .ilike('email', email)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({
          error: 'already_entered',
          ticket_code: existing.ticket_code,
          bb_awarded: existing.bb_awarded,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side roll: random integer in [15, 50]
    const bb = 15 + Math.floor(Math.random() * 36);

    // Try to insert with collision-resistant ticket code
    let ticket_code = '';
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      ticket_code = newCode();
      const { error } = await supabase.from('raffle_entries').insert({
        ticket_code,
        email: lead.email,
        role: lead.role,
        country_code: lead.country_code,
        zip_code: lead.zip_code,
        barber_status: lead.barber_status,
        specialties: lead.specialties ?? [],
        bb_awarded: bb,
        draw_week: nextSunday(),
        device_fingerprint: fingerprint ?? null,
        ip_address: ip,
      });
      if (!error) {
        lastErr = null;
        break;
      }
      // 23505 = unique violation: retry on ticket_code collision, abort on email
      if (error.code === '23505' && error.message.includes('email_unique')) {
        return new Response(
          JSON.stringify({ error: 'already_entered' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      lastErr = error;
    }
    if (lastErr) {
      return new Response(JSON.stringify({ error: String(lastErr) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Link ticket back to marketing_leads for analytics
    await supabase
      .from('marketing_leads')
      .update({ raffle_ticket_code: ticket_code, prize_bb: bb, prize_label: `${bb} BB + Ticket ${ticket_code}` })
      .ilike('email', email);

    return new Response(
      JSON.stringify({ ok: true, ticket_code, bb_awarded: bb }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
