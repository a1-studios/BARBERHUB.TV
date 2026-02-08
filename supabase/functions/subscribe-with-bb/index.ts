import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { tier_id } = await req.json();
    if (!tier_id) {
      throw new Error("Missing tier_id");
    }

    console.log(`[subscribe-with-bb] User ${user.id} requesting tier ${tier_id}`);

    // Verify user is a barber
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type, barber_bucks")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (profile.user_type !== "barber") {
      throw new Error("Only barbers can subscribe");
    }

    // Get tier details
    const { data: tier, error: tierError } = await supabase
      .from("barber_subscription_tiers")
      .select("*")
      .eq("id", tier_id)
      .single();

    if (tierError || !tier) {
      throw new Error("Invalid subscription tier");
    }

    // Calculate BB cost: $1 = 5 BB
    const bbCost = Math.round((tier.price_monthly_cents / 100) * 5);
    const currentBalance = profile.barber_bucks || 0;

    console.log(`[subscribe-with-bb] Tier: ${tier.tier_name}, BB cost: ${bbCost}, Balance: ${currentBalance}`);

    // Check sufficient funds
    if (currentBalance < bbCost) {
      return new Response(
        JSON.stringify({
          error: "insufficient_funds",
          required: bbCost,
          balance: currentBalance,
          shortfall: bbCost - currentBalance,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Deduct BB from profile
    const newBalance = currentBalance - bbCost;
    const { error: deductError } = await supabase
      .from("profiles")
      .update({ barber_bucks: newBalance })
      .eq("user_id", user.id);

    if (deductError) {
      console.error("[subscribe-with-bb] Failed to deduct BB:", deductError);
      throw new Error("Failed to deduct Barber Bucks");
    }

    // Record transaction
    const { error: txError } = await supabase
      .from("barber_bucks_transactions")
      .insert({
        user_id: user.id,
        amount: -bbCost,
        balance_after: newBalance,
        transaction_type: "subscription",
        description: `${tier.display_name} subscription (1 month)`,
        reference_id: tier.id,
      });

    if (txError) {
      console.error("[subscribe-with-bb] Failed to record transaction:", txError);
      // Rollback the deduction
      await supabase
        .from("profiles")
        .update({ barber_bucks: currentBalance })
        .eq("user_id", user.id);
      throw new Error("Failed to record transaction");
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from("barber_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from("barber_subscriptions")
        .update({
          tier_id: tier.id,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
        })
        .eq("id", existingSub.id);

      if (updateError) {
        console.error("[subscribe-with-bb] Failed to update subscription:", updateError);
        // Rollback
        await supabase.from("profiles").update({ barber_bucks: currentBalance }).eq("user_id", user.id);
        throw new Error("Failed to update subscription");
      }
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from("barber_subscriptions")
        .insert({
          user_id: user.id,
          tier_id: tier.id,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        });

      if (insertError) {
        console.error("[subscribe-with-bb] Failed to create subscription:", insertError);
        // Rollback
        await supabase.from("profiles").update({ barber_bucks: currentBalance }).eq("user_id", user.id);
        throw new Error("Failed to create subscription");
      }
    }

    console.log(`[subscribe-with-bb] Success! User ${user.id} subscribed to ${tier.display_name} for ${bbCost} BB`);

    return new Response(
      JSON.stringify({
        success: true,
        tier_name: tier.tier_name,
        display_name: tier.display_name,
        bb_spent: bbCost,
        new_balance: newBalance,
        period_end: periodEnd.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[subscribe-with-bb] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
