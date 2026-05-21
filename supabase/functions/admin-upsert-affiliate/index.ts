import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpsertBody {
  action: 'upsert' | 'delete' | 'toggle_active';
  id?: string;
  payload?: {
    title: string;
    description?: string | null;
    merchant_label?: string | null;
    price_cents: number;
    image_url: string;
    external_link: string;
    product_type?: string;
    display_order?: number;
    is_active?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) throw new Error('Unauthorized');

    const sovereignEmail = Deno.env.get('SOVEREIGN_EMAIL');
    const isSovereignEmail = sovereignEmail && user.email?.toLowerCase() === sovereignEmail.toLowerCase();
    let isAdmin = !!isSovereignEmail;
    if (!isAdmin) {
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'sovereign']);
      isAdmin = !!(roleRows && roleRows.length > 0);
    }
    if (!isAdmin) throw new Error('Admin access required');

    const body: UpsertBody = await req.json();

    if (body.action === 'delete') {
      if (!body.id) throw new Error('id required');
      const { error } = await supabase.from('affiliate_products').delete().eq('id', body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'toggle_active') {
      if (!body.id) throw new Error('id required');
      const { data: existing } = await supabase
        .from('affiliate_products')
        .select('is_active')
        .eq('id', body.id)
        .single();
      const { error } = await supabase
        .from('affiliate_products')
        .update({ is_active: !existing?.is_active })
        .eq('id', body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'upsert') {
      const p = body.payload;
      if (!p || !p.title || !p.image_url || !p.external_link || !Number.isFinite(p.price_cents) || p.price_cents < 0) {
        throw new Error('Invalid payload: title, image_url, external_link, and price_cents required');
      }
      const row: Record<string, unknown> = {
        title: p.title,
        description: p.description ?? null,
        merchant_label: p.merchant_label ?? null,
        price_cents: Math.floor(p.price_cents),
        image_url: p.image_url,
        external_link: p.external_link,
        product_type: p.product_type ?? 'affiliate',
        display_order: p.display_order ?? 0,
        is_active: p.is_active ?? true,
      };
      if (body.id) {
        const { error } = await supabase.from('affiliate_products').update(row).eq('id', body.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, id: body.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const { data, error } = await supabase.from('affiliate_products').insert(row).select('id').single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, id: data.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    throw new Error('Unknown action');
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
