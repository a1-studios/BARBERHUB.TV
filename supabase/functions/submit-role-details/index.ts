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
  country_code: z.string().min(2).max(3).optional().nullable(),
  phone_number: z.string().max(40).optional().nullable(),
});

const BarberBody = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.literal('barber'),
  barber_status: z.enum(['licensed', 'student', 'unlicensed', 'beginner', 'aspiring']),
  country_code: z.string().min(2).max(3).optional().nullable(),
  phone_number: z.string().max(40).optional().nullable(),
  zip_code: z.string().trim().min(2).max(20).optional().nullable(),
  specialties: z.array(z.string().max(40)).max(3).optional(),
  vip_code: z.string().trim().min(1).max(64).optional().nullable(),
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
      spin_eligible: true,
    };
    if (data.country_code) update.country_code = data.country_code;
    if (data.phone_number) update.phone_number = data.phone_number;
    if (data.role === 'barber') {
      update.barber_status = data.barber_status;
      if (data.zip_code) update.zip_code = data.zip_code;
      if (data.specialties && data.specialties.length > 0) update.specialties = data.specialties;
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
