import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Barber Bucks packages with bonuses
const BB_PACKAGES = {
  5: { bb: 25, bonus: 0, display: "$5 = 25 BB" },
  10: { bb: 50, bonus: 0, display: "$10 = 50 BB" },
  25: { bb: 125, bonus: 5, display: "$25 = 130 BB" },
  50: { bb: 250, bonus: 15, display: "$50 = 265 BB" },
  100: { bb: 500, bonus: 50, display: "$100 = 550 BB" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle webhook events
    const signature = req.headers.get("stripe-signature");
    
    if (signature) {
      const body = await req.text();
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      
      let event: Stripe.Event;
      
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "payment" && session.payment_status === "paid") {
          const userId = session.metadata?.user_id;
          const packageAmount = parseInt(session.metadata?.package_amount || "0");
          const tierName = session.metadata?.tier_name;

          if (!userId || !packageAmount) {
            console.error("Missing metadata in session");
            return new Response(JSON.stringify({ error: "Invalid session" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const bbPackage = BB_PACKAGES[packageAmount as keyof typeof BB_PACKAGES];
          if (!bbPackage) {
            console.error("Invalid package amount");
            return new Response(JSON.stringify({ error: "Invalid package" }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          // Calculate total BB with bonus
          const totalBB = bbPackage.bb + bbPackage.bonus;

          // Get current balance
          const { data: currentBalance } = await supabase
            .rpc("get_barber_bucks_balance", { user_uuid: userId });

          const newBalance = (currentBalance || 0) + totalBB;

          // Record transaction
          const { error: txError } = await supabase
            .from("barber_bucks_transactions")
            .insert({
              user_id: userId,
              amount: totalBB,
              transaction_type: "purchase",
              description: `Purchased ${bbPackage.display}${tierName ? ` (${tierName} discount)` : ""}`,
              stripe_payment_id: session.payment_intent as string,
              balance_after: newBalance,
            });

          if (txError) {
            console.error("Error recording transaction:", txError);
            return new Response(JSON.stringify({ error: "Transaction failed" }), {
              status: 500,
              headers: corsHeaders,
            });
          }

          // Update profile balance
          await supabase
            .from("profiles")
            .update({ barber_bucks: newBalance })
            .eq("user_id", userId);

          // Create notification
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "bb_purchase",
            title: "Barber Bucks Purchased! 💰",
            message: `You received ${totalBB} Barber Bucks. New balance: ${newBalance} BB`,
            data: { amount: totalBB, balance: newBalance },
          });

          console.log(`BB purchase completed for user ${userId}: ${totalBB} BB`);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle purchase request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { package_amount } = await req.json();

    const bbPackage = BB_PACKAGES[package_amount as keyof typeof BB_PACKAGES];
    if (!bbPackage) {
      throw new Error("Invalid package amount");
    }

    // Check if user has active subscription for discount
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("user_id", user.id)
      .single();

    let discount = 0;
    let tierName = null;

    if (profile?.user_type === "barber") {
      const { data: subscription } = await supabase
        .from("barber_subscriptions")
        .select("*, barber_subscription_tiers(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (subscription?.barber_subscription_tiers) {
        const tier = subscription.barber_subscription_tiers;
        tierName = tier.tier_name;
        
        // Apply tier discount
        if (tier.tier_name === "silver") {
          discount = 0.10; // 10% discount
        } else if (tier.tier_name === "gold") {
          discount = 0.20; // 20% discount
        }
      }
    }

    // Calculate final price in cents
    const basePrice = package_amount * 100;
    const finalPrice = Math.round(basePrice * (1 - discount));

    // Get or create Stripe customer
    let customerId: string;
    
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Barber Bucks - ${bbPackage.display}`,
              description: discount > 0 
                ? `${Math.round(discount * 100)}% ${tierName} tier discount applied`
                : "In-app currency for donations, gear, and services",
            },
            unit_amount: finalPrice,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=bb`,
      cancel_url: `${req.headers.get("origin")}/payment-canceled`,
      metadata: {
        user_id: user.id,
        package_amount: package_amount.toString(),
        tier_name: tierName || "none",
      },
    });

    console.log("BB purchase session created:", session.id, "for", bbPackage.display);

    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
        discount_applied: discount,
        final_price_cents: finalPrice,
        bb_amount: bbPackage.bb + bbPackage.bonus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error purchasing Barber Bucks:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
