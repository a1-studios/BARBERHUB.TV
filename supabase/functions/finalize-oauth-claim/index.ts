import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const Body = z.object({
  role: z.enum(['barber', 'fan']),
  barber_status: z.enum(['licensed', 'unlicensed', 'student', 'beginner', 'aspiring']).optional().nullable(),
  country_code: z.string().min(2).max(3),
  phone_number: z.string().max(40).optional().nullable(),
  vip_code: z.string().trim().min(1).max(64).optional().nullable(),
});

const STATUS_TO_SUB_CATEGORY: Record<string, string> = {
  licensed: 'licensed_pro',
  unlicensed: 'unlicensed_pro',
  student: 'student',
  beginner: 'beginner',
  aspiring: 'aspiring',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate user from JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { role, barber_status, country_code, phone_number, vip_code } = parsed.data;
    if (role === 'barber' && !barber_status) {
      return new Response(JSON.stringify({ error: 'barber_status_required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const email = (user.email ?? '').toLowerCase();

    // VIP-gate barber promotion BEFORE any mutation
    let vipCodeNorm: string | null = null;
    if (role === 'barber') {
      const { data: vipModeOn } = await admin.rpc('is_global_vip_mode');
      vipCodeNorm = vip_code?.trim().toUpperCase() ?? null;
      if (vipModeOn) {
        if (!vipCodeNorm) {
          return new Response(JSON.stringify({ error: 'vip_code_required' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const { data: vData, error: vErr } = await admin.rpc('validate_access_code', { p_code: vipCodeNorm });
        const row = Array.isArray(vData) ? vData[0] : vData;
        if (vErr || !row?.valid) {
          return new Response(JSON.stringify({ error: 'invalid_vip_code' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 1. Update country_code + sub_category + phone on profiles up front
    const profileUpdate: Record<string, unknown> = { country_code };
    if (phone_number && phone_number.trim()) {
      profileUpdate.phone_number = phone_number.trim();
    }
    if (role === 'barber' && barber_status) {
      profileUpdate.sub_category = STATUS_TO_SUB_CATEGORY[barber_status] ?? barber_status;
    }
    await admin.from('profiles').update(profileUpdate).eq('user_id', user.id);


    // 2. Enforce binary role — skip the sync RPC if user is already in this role
    const { data: currentProfile } = await admin
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .maybeSingle();

    if (currentProfile?.user_type !== role) {
      const { error: syncErr } = await admin.rpc('sync_user_binary_role', {
        p_user_id: user.id,
        p_role: role,
      });
      if (syncErr) {
        return new Response(JSON.stringify({ error: syncErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2b. Redeem VIP code post-role-flip
    if (role === 'barber' && vipCodeNorm) {
      await admin.rpc('redeem_access_code', {
        p_code: vipCodeNorm,
        p_user_id: user.id,
        p_email: email,
      });
    }

    // 3. Link the marketing lead and credit BB if not already claimed
    const { data: lead } = await admin
      .from('marketing_leads')
      .select('id, prize_bb, claimed_at, raffle_ticket_code')
      .ilike('email', email)
      .maybeSingle();

    let credited = 0;
    let ticket_code: string | null = null;

    if (lead) {
      ticket_code = lead.raffle_ticket_code ?? null;
      const updates: Record<string, unknown> = {
        linked_user_id: user.id,
        role,
      };
      if (barber_status) updates.barber_status = barber_status;
      if (phone_number) updates.phone_number = phone_number;

      await admin.from('marketing_leads').update(updates).eq('id', lead.id);

      // Credit BB once — ticket prize is internal, this seeds their starting balance
      if (!lead.claimed_at && lead.prize_bb && lead.prize_bb > 0) {
        const { data: prof } = await admin
          .from('profiles')
          .select('barber_bucks')
          .eq('user_id', user.id)
          .maybeSingle();
        const current = prof?.barber_bucks ?? 0;
        await admin
          .from('profiles')
          .update({ barber_bucks: current + lead.prize_bb })
          .eq('user_id', user.id);
        credited = lead.prize_bb;
        await admin
          .from('marketing_leads')
          .update({ claimed_at: new Date().toISOString() })
          .eq('id', lead.id);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, ticket_code, bb_credited: credited }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
