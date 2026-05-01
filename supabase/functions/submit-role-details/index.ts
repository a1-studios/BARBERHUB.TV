import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const FanBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.literal('fan'),
  country_code: z.string().min(2).max(3),
});

const BarberBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.literal('barber'),
  country_code: z.string().min(2).max(3),
  zip_code: z.string().trim().min(2).max(20),
  barber_status: z.enum(['licensed', 'student', 'unlicensed', 'beginner']),
  specialties: z.array(z.string().max(40)).min(1).max(3),
});

const Body = z.union([FanBody, BarberBody]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const data = parsed.data;
    const update: Record<string, unknown> = {
      email: data.email,
      role: data.role,
      country_code: data.country_code,
      spin_eligible: true,
    };
    if (data.role === 'barber') {
      update.zip_code = data.zip_code;
      update.barber_status = data.barber_status;
      update.specialties = data.specialties;
    }

    const { error } = await supabase
      .from('marketing_leads')
      .upsert(update, { onConflict: 'email' });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
