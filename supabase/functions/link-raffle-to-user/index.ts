import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'missing_auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user } } = await anonClient.auth.getUser(auth.replace('Bearer ', ''));
    if (!user || !user.email) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: ticket } = await admin
      .from('raffle_entries')
      .select('id, ticket_code, bb_awarded, claimed_user_id')
      .ilike('email', user.email)
      .maybeSingle();

    if (!ticket) {
      return new Response(JSON.stringify({ ok: true, linked: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ticket.claimed_user_id) {
      return new Response(
        JSON.stringify({ ok: true, linked: true, already: true, ticket_code: ticket.ticket_code }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Link ticket to user
    await admin
      .from('raffle_entries')
      .update({ claimed_user_id: user.id, claimed_at: new Date().toISOString() })
      .eq('id', ticket.id);

    // Credit BB to wallet via barber_bucks_transactions (sync trigger updates profiles.barber_bucks)
    const { data: profile } = await admin
      .from('profiles')
      .select('barber_bucks')
      .eq('user_id', user.id)
      .maybeSingle();

    const before = profile?.barber_bucks ?? 0;
    await admin.from('barber_bucks_transactions').insert({
      user_id: user.id,
      amount: ticket.bb_awarded,
      balance_after: before + ticket.bb_awarded,
      transaction_type: 'raffle_welcome',
      description: `Welcome raffle ticket ${ticket.ticket_code}`,
      reference_id: ticket.id,
    });

    return new Response(
      JSON.stringify({ ok: true, linked: true, ticket_code: ticket.ticket_code, bb_awarded: ticket.bb_awarded }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
