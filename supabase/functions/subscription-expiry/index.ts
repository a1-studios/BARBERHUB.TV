import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find active subscriptions where period has ended
    const { data: expiredSubs, error } = await supabase
      .from("barber_subscriptions")
      .select("id, user_id, tier_id, stripe_subscription_id, current_period_end")
      .eq("status", "active")
      .lt("current_period_end", new Date().toISOString())
      .not("current_period_end", "is", null);

    if (error) throw error;

    let processed = 0;

    for (const sub of expiredSubs || []) {
      // Mark subscription as expired
      await supabase
        .from("barber_subscriptions")
        .update({ status: "expired", canceled_at: new Date().toISOString() })
        .eq("id", sub.id);

      // Remove tier from barber profile
      await supabase
        .from("barber_profiles")
        .update({
          active_subscription_tier: null,
          subscription_expires_at: null,
        })
        .eq("user_id", sub.user_id);

      // Notify user
      await supabase.from("notifications").insert({
        user_id: sub.user_id,
        type: "subscription_expired",
        title: "Subscription Expired ⚠️",
        message: "Your subscription has expired. Upgrade to regain premium battle slots and features.",
        data: { subscription_id: sub.id },
      });

      processed++;
    }

    console.log(`Subscription expiry: processed ${processed} expired subscriptions`);

    return new Response(
      JSON.stringify({ success: true, expired_count: processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in subscription-expiry:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
