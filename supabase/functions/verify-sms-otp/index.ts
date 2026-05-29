// Verify SMS OTP, create/find auth user, return a magic-link action_link the
// client exchanges for a session via supabase.auth.verifyOtp({ type: 'magiclink' }).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const E164_RE = /^\+[1-9]\d{6,14}$/;
const CODE_RE = /^\d{6}$/;
const MAX_ATTEMPTS = 5;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone ?? '').trim();
    const code = String(body?.code ?? '').trim();

    if (!E164_RE.test(phone) || !CODE_RE.test(code)) {
      return new Response(JSON.stringify({ error: 'Bad request' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: row, error: selErr } = await admin
      .from('phone_otp_codes')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!row) {
      return new Response(JSON.stringify({ error: 'No code requested for this number' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Code expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: 'Too many attempts' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const codeHash = await sha256Hex(code);
    if (codeHash !== row.code_hash) {
      await admin.from('phone_otp_codes').update({ attempts: row.attempts + 1 }).eq('phone', phone);
      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Consume code
    await admin.from('phone_otp_codes').delete().eq('phone', phone);

    // Find or create user
    const syntheticEmail = `phone+${phone.replace(/[^\d]/g, '')}@sms.barberhub.tv`;

    // Try lookup by phone first
    // @ts-ignore admin list
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = listed?.users?.find((u: any) => u.phone === phone || u.email === syntheticEmail) ?? null;

    if (!user) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { sms_signup: true },
      });
      if (createErr) throw createErr;
      user = created.user;
      // handle_new_user trigger seeds profiles + user_roles with role='fan' by default.
    }

    if (!user) throw new Error('Could not resolve user');

    // Generate a magic link for the synthetic email; client exchanges hash for a session.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });
    if (linkErr) throw linkErr;

    return new Response(
      JSON.stringify({
        ok: true,
        email: user.email,
        action_link: link.properties?.action_link,
        hashed_token: link.properties?.hashed_token,
        user_id: user.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('verify-sms-otp error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
