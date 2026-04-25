// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readClientIp(req: Request): string | null {
  const candidates = [
    req.headers.get('cf-connecting-ip'),
    req.headers.get('x-real-ip'),
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  ];
  for (const c of candidates) {
    if (c && c.length > 0) return c;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({} as any));
    const action: 'check' | 'mark_shown' | 'mark_completed' | 'mark_skipped' =
      body.action ?? 'check';
    const fingerprint: string | undefined = body.fingerprint;

    if (!fingerprint || typeof fingerprint !== 'string') {
      return json({ error: 'fingerprint required' }, 400);
    }

    const ip = readClientIp(req);
    const ipHash = ip ? await sha256(ip) : null;
    const userAgent = req.headers.get('user-agent') ?? null;

    // Look up existing visitor by fingerprint OR matching ip_hash
    const { data: existing } = await supabase
      .from('promotion_gate_visitors')
      .select('*')
      .or(
        `fingerprint.eq.${fingerprint}${ipHash ? `,ip_hash.eq.${ipHash}` : ''}`
      )
      .limit(1)
      .maybeSingle();

    if (action === 'check') {
      if (!existing) {
        return json({
          shouldShowGate: true,
          reason: 'new_visitor',
        });
      }
      return json({
        shouldShowGate: !existing.completed && !existing.skipped && existing.shown_count === 0,
        reason: existing.completed
          ? 'completed'
          : existing.skipped
            ? 'skipped'
            : 'seen_before',
      });
    }

    if (action === 'mark_shown') {
      if (existing) {
        await supabase
          .from('promotion_gate_visitors')
          .update({
            last_seen_at: new Date().toISOString(),
            shown_count: (existing.shown_count ?? 0) + 1,
            ip_hash: ipHash ?? existing.ip_hash,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('promotion_gate_visitors').insert({
          fingerprint,
          ip_hash: ipHash,
          shown_count: 1,
          user_agent: userAgent,
        });
      }
      return json({ ok: true });
    }

    if (action === 'mark_completed' || action === 'mark_skipped') {
      const patch =
        action === 'mark_completed'
          ? { completed: true }
          : { skipped: true };

      if (existing) {
        await supabase
          .from('promotion_gate_visitors')
          .update({
            ...patch,
            last_seen_at: new Date().toISOString(),
            ip_hash: ipHash ?? existing.ip_hash,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('promotion_gate_visitors').insert({
          fingerprint,
          ip_hash: ipHash,
          user_agent: userAgent,
          shown_count: 1,
          ...patch,
        });
      }
      return json({ ok: true });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unexpected error';
    console.error('[check-gate-eligibility]', message);
    return json({ error: message }, 500);
  }
});
