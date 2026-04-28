import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate caller JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const studentId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const contentId = body?.content_id;
    if (!contentId || typeof contentId !== 'string') {
      return new Response(JSON.stringify({ error: 'content_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load course
    const { data: course, error: courseErr } = await admin
      .from('creator_content')
      .select('id, creator_id, price_bb, title')
      .eq('id', contentId)
      .single();

    if (courseErr || !course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (course.creator_id === studentId) {
      return new Response(JSON.stringify({ error: 'Cannot unlock own course' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const price = course.price_bb || 0;

    // Already unlocked?
    const { data: existing } = await admin
      .from('academy_unlocks')
      .select('id')
      .eq('content_id', contentId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, already_unlocked: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Free course — just record
    if (price === 0) {
      await admin.from('academy_unlocks').insert({
        content_id: contentId,
        student_id: studentId,
        educator_id: course.creator_id,
        bb_paid: 0,
      });
      return new Response(JSON.stringify({ ok: true, free: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Paid — check student balance
    const { data: studentProfile } = await admin
      .from('profiles')
      .select('barber_bucks')
      .eq('user_id', studentId)
      .single();

    const balance = studentProfile?.barber_bucks ?? 0;
    if (balance < price) {
      return new Response(
        JSON.stringify({ error: 'insufficient_funds', balance, price }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Splits: 85% educator, 15% platform (kept as platform fee)
    const educatorCut = Math.floor(price * 0.85);

    // Deduct from student
    const { error: deductErr } = await admin
      .from('profiles')
      .update({ barber_bucks: balance - price })
      .eq('user_id', studentId);
    if (deductErr) throw deductErr;

    // Credit educator
    const { data: educatorProfile } = await admin
      .from('profiles')
      .select('barber_bucks')
      .eq('user_id', course.creator_id)
      .single();
    const educatorBalance = educatorProfile?.barber_bucks ?? 0;
    await admin
      .from('profiles')
      .update({ barber_bucks: educatorBalance + educatorCut })
      .eq('user_id', course.creator_id);

    // Record unlock
    await admin.from('academy_unlocks').insert({
      content_id: contentId,
      student_id: studentId,
      educator_id: course.creator_id,
      bb_paid: price,
    });

    // Ledger entries
    await admin.from('barber_bucks_transactions').insert([
      {
        user_id: studentId,
        amount: -price,
        balance_after: balance - price,
        transaction_type: 'academy_unlock',
        reference_id: contentId,
        description: `Unlocked: ${course.title}`,
      },
      {
        user_id: course.creator_id,
        amount: educatorCut,
        balance_after: educatorBalance + educatorCut,
        transaction_type: 'academy_earning',
        reference_id: contentId,
        description: `Course sale: ${course.title}`,
      },
    ]);

    return new Response(
      JSON.stringify({ ok: true, bb_paid: price, educator_cut: educatorCut }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('academy-unlock-course error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
