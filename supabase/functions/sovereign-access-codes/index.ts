import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_EMAIL = Deno.env.get('SOVEREIGN_EMAIL') || 'a1studios.film@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);
    if (user.email !== SOVEREIGN_EMAIL) return json({ error: 'Not found' }, 404);
    const { data: hasRole } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'sovereign' });
    if (!hasRole) return json({ error: 'Not found' }, 404);

    const { action, ...payload } = await req.json();

    switch (action) {
      case 'list_codes': {
        const { data, error } = await supabase
          .from('access_codes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        return json({ codes: data });
      }
      case 'create_code': {
        const code = (payload.code || randomCode()).toUpperCase();
        const { data, error } = await supabase
          .from('access_codes')
          .insert({
            code,
            type: payload.type === 'promo' ? 'promo' : 'vip',
            max_uses: payload.max_uses ?? null,
            notes: payload.notes ?? null,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        return json({ code: data });
      }
      case 'toggle_code': {
        const { data, error } = await supabase
          .from('access_codes')
          .update({ is_active: !!payload.is_active })
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        return json({ code: data });
      }
      case 'delete_code': {
        const { error } = await supabase.from('access_codes').delete().eq('id', payload.id);
        if (error) throw error;
        return json({ success: true });
      }
      case 'get_redemptions': {
        const { data, error } = await supabase
          .from('access_code_redemptions')
          .select('*')
          .eq('code_id', payload.code_id)
          .order('redeemed_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        return json({ redemptions: data });
      }
      case 'set_vip_mode': {
        const value = payload.enabled ? 'true' : 'false';
        const { error } = await supabase
          .from('platform_state')
          .upsert({ key: 'global_vip_mode', value }, { onConflict: 'key' });
        if (error) throw error;
        return json({ enabled: payload.enabled });
      }
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (e: any) {
    console.error('sovereign-access-codes error', e);
    return json({ error: e?.message ?? 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'VIP-';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
