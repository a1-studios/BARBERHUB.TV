import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle webhook events from Stripe
    const signature = req.headers.get("stripe-signature");
    
    if (signature) {
      // This is a webhook event
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

      console.log("Processing webhook event:", event.type);

      // Handle different event types
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          
          if (session.mode === "subscription" && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );

            const userId = session.metadata?.user_id;
            const tierId = session.metadata?.tier_id;
            const tierName = session.metadata?.tier_name;

            if (!userId || !tierId) {
              console.error("Missing metadata in session");
              break;
            }

            // Create subscription record
            const { error: subError } = await supabase
              .from("barber_subscriptions")
              .upsert({
                user_id: userId,
                tier_id: tierId,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: subscription.customer as string,
                status: "active",
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              });

            if (subError) {
              console.error("Error creating subscription record:", subError);
            }

            // Update barber profile with tier
            await supabase
              .from("barber_profiles")
              .update({
                active_subscription_tier: tierName,
                subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq("user_id", userId);

            // Create notification
            await supabase.from("notifications").insert({
              user_id: userId,
              type: "subscription_active",
              title: "Subscription Activated! 🎉",
              message: `Your ${tierName} subscription is now active. Enjoy your benefits!`,
              data: { tier_name: tierName },
            });

            console.log("Subscription activated for user:", userId);
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          
          const { data: existingSub } = await supabase
            .from("barber_subscriptions")
            .select("user_id, tier_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (existingSub) {
            await supabase
              .from("barber_subscriptions")
              .update({
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
              })
              .eq("stripe_subscription_id", subscription.id);

            console.log("Subscription updated:", subscription.id);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          
          const { data: existingSub } = await supabase
            .from("barber_subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (existingSub) {
            await supabase
              .from("barber_subscriptions")
              .update({
                status: "canceled",
                canceled_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", subscription.id);

            // Remove tier from barber profile
            await supabase
              .from("barber_profiles")
              .update({
                active_subscription_tier: null,
                subscription_expires_at: null,
              })
              .eq("user_id", existingSub.user_id);

            // Notify user
            await supabase.from("notifications").insert({
              user_id: existingSub.user_id,
              type: "subscription_canceled",
              title: "Subscription Canceled",
              message: "Your subscription has been canceled. You'll retain access until the end of your billing period.",
            });

            console.log("Subscription canceled for user:", existingSub.user_id);
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          
          if (invoice.subscription) {
            const { data: existingSub } = await supabase
              .from("barber_subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", invoice.subscription as string)
              .single();

            if (existingSub) {
              await supabase
                .from("barber_subscriptions")
                .update({ status: "past_due" })
                .eq("stripe_subscription_id", invoice.subscription as string);

              // Notify user
              await supabase.from("notifications").insert({
                user_id: existingSub.user_id,
                type: "payment_failed",
                title: "Payment Failed ⚠️",
                message: "Your subscription payment failed. Please update your payment method to avoid service interruption.",
              });
            }
          }
          break;
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle manual subscription management (cancel, upgrade, downgrade)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { action, new_tier_name } = await req.json();

    // Get current subscription
    const { data: currentSub, error: subError } = await supabase
      .from("barber_subscriptions")
      .select("*, barber_subscription_tiers(*)")
      .eq("user_id", user.id)
      .single();

    if (subError || !currentSub) {
      throw new Error("No active subscription found");
    }

    if (action === "cancel") {
      // Cancel at period end
      await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      await supabase
        .from("barber_subscriptions")
        .update({ cancel_at_period_end: true })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ message: "Subscription will cancel at period end" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "change_tier" && new_tier_name) {
      // Get new tier details
      const { data: newTier, error: tierError } = await supabase
        .from("barber_subscription_tiers")
        .select("*")
        .eq("tier_name", new_tier_name)
        .single();

      if (tierError || !newTier) {
        throw new Error("Invalid tier");
      }

      // Create new price in Stripe and update subscription
      const price = await stripe.prices.create({
        currency: "usd",
        unit_amount: newTier.price_monthly_cents,
        recurring: { interval: "month" },
        product_data: {
          name: newTier.display_name,
        },
      });

      const subscription = await stripe.subscriptions.retrieve(
        currentSub.stripe_subscription_id
      );

      await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: price.id,
          },
        ],
        proration_behavior: "always_invoice",
      });

      // Update database
      await supabase
        .from("barber_subscriptions")
        .update({ tier_id: newTier.id })
        .eq("user_id", user.id);

      await supabase
        .from("barber_profiles")
        .update({ active_subscription_tier: newTier.tier_name })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ message: "Subscription tier updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");

  } catch (error) {
    console.error("Error managing subscription:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
