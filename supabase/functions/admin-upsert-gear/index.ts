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
    name: string;
    description?: string | null;
    price_bb: number;
    stock_quantity?: number | null;
    image_url?: string | null;
    requires_shipping?: boolean;
    shopify_product_id?: string | null;
    shopify_variant_id?: string | null;
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

    // Admin gate: SOVEREIGN_EMAIL OR has_role admin
    const sovereignEmail = Deno.env.get('SOVEREIGN_EMAIL');
    const isSovereign = sovereignEmail && user.email?.toLowerCase() === sovereignEmail.toLowerCase();
    let isAdmin = isSovereign;
    if (!isAdmin) {
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');
      isAdmin = !!(roleRows && roleRows.length > 0);
    }
    if (!isAdmin) throw new Error('Admin access required');

    const body: UpsertBody = await req.json();

    if (body.action === 'delete') {
      if (!body.id) throw new Error('id required');
      const { error } = await supabase.from('products').delete().eq('id', body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'toggle_active') {
      if (!body.id) throw new Error('id required');
      const { data: existing } = await supabase
        .from('products')
        .select('is_active')
        .eq('id', body.id)
        .single();
      const { error } = await supabase
        .from('products')
        .update({ is_active: !existing?.is_active })
        .eq('id', body.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'upsert') {
      const p = body.payload;
      if (!p || !p.name || !Number.isFinite(p.price_bb) || p.price_bb < 0) {
        throw new Error('Invalid payload');
      }
      const row: Record<string, unknown> = {
        name: p.name,
        description: p.description ?? null,
        price_bb: Math.floor(p.price_bb),
        category: 'gear',
        stock_quantity: p.stock_quantity ?? null,
        image_url: p.image_url ?? null,
        requires_shipping: !!p.requires_shipping,
        shopify_product_id: p.shopify_product_id ?? null,
        shopify_variant_id: p.shopify_variant_id ?? null,
        display_order: p.display_order ?? 0,
        is_active: p.is_active ?? true,
      };
      if (body.id) {
        const { error } = await supabase.from('products').update(row).eq('id', body.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, id: body.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const { data, error } = await supabase.from('products').insert(row).select('id').single();
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
