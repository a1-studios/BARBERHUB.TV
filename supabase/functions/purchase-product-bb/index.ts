import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseRequest {
  product_id: string;
  quantity: number;
  shipping_address?: object;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { product_id, quantity = 1, shipping_address }: PurchaseRequest = await req.json();

    console.log(`Processing product purchase: ${product_id} x${quantity} for ${user.id}`);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      throw new Error('Product not found or unavailable');
    }

    // Check stock
    if (product.stock_quantity !== null && product.stock_quantity < quantity) {
      throw new Error(`Insufficient stock. Only ${product.stock_quantity} available.`);
    }

    // Get user profile and check subscription tier for discount
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barber_bucks, user_type')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not find your profile');
    }

    // Get subscription tier for discount
    let discountPercent = 0;
    if (profile.user_type === 'barber') {
      const { data: subscription } = await supabase
        .from('barber_subscriptions')
        .select('tier_id, barber_subscription_tiers(tier_name, features)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription?.barber_subscription_tiers) {
        const tier = subscription.barber_subscription_tiers as any;
        const features = (Array.isArray(tier) ? tier[0]?.features : tier.features) as any;
        discountPercent = features?.gear_discount_percent || product.barber_discount_percent || 0;
      }
    }

    // Check tier requirements (skip when master tier toggle is OFF)
    if (product.tier_required) {
      const { data: tiersFlag } = await supabase
        .from('platform_state')
        .select('value')
        .eq('key', 'tiers_enabled')
        .maybeSingle();

      const tiersGloballyEnabled = tiersFlag?.value !== 'false';

      if (tiersGloballyEnabled) {
        const { data: subscription } = await supabase
          .from('barber_subscriptions')
          .select('tier_id, barber_subscription_tiers(tier_name)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        const tierHierarchy = ['bronze', 'silver', 'gold'];
        const subTier = subscription?.barber_subscription_tiers as any;
        const tierName = Array.isArray(subTier) ? subTier[0]?.tier_name : subTier?.tier_name;
        const userTierIndex = tierName
          ? tierHierarchy.indexOf(String(tierName).toLowerCase())
          : -1;
        const requiredTierIndex = tierHierarchy.indexOf(product.tier_required.toLowerCase());

        if (userTierIndex < requiredTierIndex) {
          throw new Error(`This product requires ${product.tier_required} tier or higher subscription`);
        }
      }
    }

    // Calculate total cost with discount
    const basePrice = product.price_bb * quantity;
    const discountAmount = Math.floor(basePrice * (discountPercent / 100));
    const totalCost = basePrice - discountAmount;

    const currentBalance = profile.barber_bucks || 0;

    if (currentBalance < totalCost) {
      throw new Error(`Insufficient Barber Bucks. You need ${totalCost} BB but have ${currentBalance} BB.`);
    }

    // Deduct BB
    const newBalance = currentBalance - totalCost;
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ barber_bucks: newBalance })
      .eq('user_id', user.id);

    if (deductError) {
      throw new Error('Failed to process payment');
    }

    // Record transaction
    await supabase
      .from('barber_bucks_transactions')
      .insert({
        user_id: user.id,
        amount: -totalCost,
        balance_after: newBalance,
        transaction_type: 'product_purchase',
        description: `Purchased: ${product.name} x${quantity}${discountAmount > 0 ? ` (${discountPercent}% discount)` : ''}`,
        reference_id: product_id
      });

    // Update stock if applicable
    if (product.stock_quantity !== null) {
      await supabase
        .from('products')
        .update({ stock_quantity: product.stock_quantity - quantity })
        .eq('id', product_id);
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('product_orders')
      .insert({
        user_id: user.id,
        product_id,
        quantity,
        total_bb_cost: totalCost,
        discount_applied: discountAmount,
        shipping_address,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order create error:', orderError);
      // Non-fatal, payment already processed
    }

    // Notify user
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'purchase_complete',
        title: '🛒 Purchase Complete!',
        message: `You purchased ${product.name} x${quantity} for ${totalCost} BB${discountAmount > 0 ? ` (saved ${discountAmount} BB!)` : ''}`,
        data: {
          product_id,
          order_id: order?.id,
          total_cost: totalCost,
          discount: discountAmount
        }
      });

    console.log(`Product purchase successful: ${product.name} x${quantity} for ${totalCost} BB`);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order?.id,
        product: product.name,
        quantity,
        total_cost: totalCost,
        discount_applied: discountAmount,
        new_balance: newBalance,
        message: `Successfully purchased ${product.name}!`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Product purchase error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to purchase product' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
