import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = Deno.env.get('SOVEREIGN_EMAIL') || 'a1studios.film@gmail.com';

async function verifySovereign(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw { status: 401, message: 'Unauthorized' };
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw { status: 401, message: 'Unauthorized' };
  if (user.email !== SOVEREIGN_EMAIL) throw { status: 404, message: 'Not found' };
  const { data: hasRole } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'sovereign' });
  if (!hasRole) throw { status: 404, message: 'Not found' };
  return user;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const admin = await verifySovereign(req, supabase);
    const { report_id, target_type, target_id, reason } = await req.json();

    // Resolve owner user_id from target
    let ownerUserId: string | null = null;
    const ownerMap: Record<string, { table: string; col: string; resolveBarber?: boolean }> = {
      creation: { table: 'creations', col: 'barber_id', resolveBarber: true },
      post: { table: 'creations', col: 'barber_id', resolveBarber: true },
      battle_submission: { table: 'battle_submissions', col: 'user_id' },
      creator_content: { table: 'creator_content', col: 'creator_id' },
      user: { table: '', col: '' },
    };
    if (target_type === 'user') {
      ownerUserId = target_id;
    } else {
      const cfg = ownerMap[target_type];
      if (cfg) {
        const { data: row } = await supabase.from(cfg.table).select(cfg.col).eq('id', target_id).maybeSingle();
        const raw = row?.[cfg.col];
        if (cfg.resolveBarber && raw) {
          const { data: bp } = await supabase.from('barber_profiles').select('user_id').eq('id', raw).maybeSingle();
          ownerUserId = bp?.user_id || null;
        } else {
          ownerUserId = raw || null;
        }
      }
    }

    if (!ownerUserId) throw new Error('Could not resolve user to terminate');

    // Flip ban flag
    await supabase
      .from('profiles')
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: reason || 'Repeat copyright infringement',
      })
      .eq('user_id', ownerUserId);

    // Revoke sessions
    try {
      await supabase.auth.admin.signOut(ownerUserId);
    } catch (e) {
      console.error('signOut failed', e);
    }

    // Audit
    await supabase.from('moderation_actions').insert({
      admin_id: admin.id,
      target_user_id: ownerUserId,
      target_content_id: target_type !== 'user' ? target_id : null,
      target_content_type: target_type,
      action_type: 'terminate_account',
      reason: reason || null,
      metadata: { report_id: report_id || null },
    });

    if (report_id) {
      await supabase
        .from('content_reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: admin.id,
          resolution_action: 'account_terminated',
        })
        .eq('id', report_id);
    }

    return new Response(JSON.stringify({ success: true, terminated_user_id: ownerUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[admin-moderation-terminate]', e);
    return new Response(JSON.stringify({ success: false, error: e.message || 'Error' }), {
      status: e.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
