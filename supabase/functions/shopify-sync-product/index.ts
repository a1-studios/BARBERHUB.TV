import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = '2024-10';
const BB_PER_USD = 5; // economy memory: $1 = 5 BB

interface Body {
  action: 'push' | 'pull' | 'list_shop_products';
  product_id?: string;          // local products.id
  shopify_product_id?: string;  // Shopify numeric id (GID handled below)
  limit?: number;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const STORE = Deno.env.get('SHOPIFY_STORE_DOMAIN');
    const TOKEN = Deno.env.get('SHOPIFY_ADMIN_TOKEN');
    if (!STORE || !TOKEN) {
      return json({ error: 'Shopify is not configured. Add SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN secrets.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Auth + admin check (same pattern as admin-upsert-gear)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const sovereignEmail = Deno.env.get('SOVEREIGN_EMAIL');
    let isAdmin = !!(sovereignEmail && user.email?.toLowerCase() === sovereignEmail.toLowerCase());
    if (!isAdmin) {
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'sovereign']);
      isAdmin = !!(roleRows && roleRows.length > 0);
    }
    if (!isAdmin) return json({ error: 'Admin access required' }, 403);

    const body: Body = await req.json();
    const baseUrl = `https://${STORE}/admin/api/${API_VERSION}`;
    const headers = {
      'X-Shopify-Access-Token': TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // ---------- list_shop_products ----------
    if (body.action === 'list_shop_products') {
      const limit = Math.min(Math.max(body.limit ?? 50, 1), 250);
      const res = await fetch(`${baseUrl}/products.json?limit=${limit}`, { headers });
      const data = await res.json();
      if (!res.ok) return json({ error: `Shopify list failed [${res.status}]`, details: data }, 502);
      const products = (data.products || []).map((p: any) => ({
        id: String(p.id),
        title: p.title,
        variant_id: p.variants?.[0]?.id ? String(p.variants[0].id) : null,
        price: p.variants?.[0]?.price ?? null,
        image: p.image?.src ?? p.images?.[0]?.src ?? null,
        images: (p.images || []).map((i: any) => i.src),
      }));
      return json({ products });
    }

    // ---------- push ----------
    if (body.action === 'push') {
      if (!body.product_id) return json({ error: 'product_id required' }, 400);
      const { data: row, error: rErr } = await supabase
        .from('products')
        .select('id, name, description, price_bb, stock_quantity, image_url, image_urls, requires_shipping, shopify_product_id, shopify_variant_id')
        .eq('id', body.product_id)
        .single();
      if (rErr || !row) return json({ error: 'Product not found' }, 404);

      const price = (Number(row.price_bb) / BB_PER_USD).toFixed(2);
      const images = (row.image_urls?.length ? row.image_urls : (row.image_url ? [row.image_url] : []))
        .map((src: string) => ({ src }));

      const productPayload: any = {
        title: row.name,
        body_html: row.description || '',
        status: 'active',
        images,
      };

      let res: Response;
      if (row.shopify_product_id) {
        productPayload.id = Number(row.shopify_product_id);
        productPayload.variants = [{
          id: row.shopify_variant_id ? Number(row.shopify_variant_id) : undefined,
          price,
          requires_shipping: !!row.requires_shipping,
          inventory_management: row.stock_quantity == null ? null : 'shopify',
        }];
        res = await fetch(`${baseUrl}/products/${row.shopify_product_id}.json`, {
          method: 'PUT', headers, body: JSON.stringify({ product: productPayload }),
        });
      } else {
        productPayload.variants = [{
          price,
          requires_shipping: !!row.requires_shipping,
          inventory_management: row.stock_quantity == null ? null : 'shopify',
        }];
        res = await fetch(`${baseUrl}/products.json`, {
          method: 'POST', headers, body: JSON.stringify({ product: productPayload }),
        });
      }

      const data = await res.json();
      if (!res.ok) return json({ error: `Shopify sync failed [${res.status}]`, details: data }, 502);

      const newPid = String(data.product?.id ?? row.shopify_product_id ?? '');
      const newVid = String(data.product?.variants?.[0]?.id ?? row.shopify_variant_id ?? '');
      await supabase
        .from('products')
        .update({ shopify_product_id: newPid || null, shopify_variant_id: newVid || null })
        .eq('id', row.id);

      return json({ success: true, shopify_product_id: newPid, shopify_variant_id: newVid });
    }

    // ---------- pull ----------
    if (body.action === 'pull') {
      if (!body.product_id) return json({ error: 'product_id required' }, 400);
      const { data: row } = await supabase
        .from('products')
        .select('id, shopify_product_id')
        .eq('id', body.product_id)
        .single();
      if (!row?.shopify_product_id) return json({ error: 'Product not linked to Shopify' }, 400);

      const res = await fetch(`${baseUrl}/products/${row.shopify_product_id}.json`, { headers });
      const data = await res.json();
      if (!res.ok) return json({ error: `Shopify pull failed [${res.status}]`, details: data }, 502);

      const p = data.product;
      const images: string[] = (p.images || []).map((i: any) => i.src);
      const price = Number(p.variants?.[0]?.price ?? 0);
      const update = {
        name: p.title,
        description: p.body_html || null,
        price_bb: Math.max(1, Math.round(price * BB_PER_USD)),
        image_url: images[0] ?? null,
        image_urls: images.slice(0, 5),
        shopify_variant_id: p.variants?.[0]?.id ? String(p.variants[0].id) : null,
      };
      await supabase.from('products').update(update).eq('id', row.id);
      return json({ success: true, updated: update });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err: any) {
    console.error('shopify-sync-product error', err);
    return json({ error: err.message || 'Failed' }, 500);
  }
});
