import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Must match the packages in purchase-barber-bucks
const BB_PACKAGES: Record<number, { bb: number; bonus: number; display: string }> = {
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("Missing session_id");
    }

    // Try to authenticate user from header; fall back to Stripe metadata
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        console.log(`[verify-bb-purchase] Authenticated user: ${userId}`);
      } else {
        console.warn(`[verify-bb-purchase] Auth header present but invalid, will use Stripe metadata`);
      }
    } else {
      console.log(`[verify-bb-purchase] No auth header, will resolve user from Stripe metadata`);
    }

    console.log(`[verify-bb-purchase] Verifying session ${session_id}`);

    // Retrieve Stripe checkout session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Verify payment was completed
    if (session.payment_status !== "paid") {
      console.log(`[verify-bb-purchase] Session not paid: ${session.payment_status}`);
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Resolve the user: prefer authenticated user, fall back to Stripe metadata
    const sessionUserId = session.metadata?.user_id;
    if (!sessionUserId) {
      throw new Error("No user_id in Stripe session metadata");
    }

    if (userId && userId !== sessionUserId) {
      console.error(`[verify-bb-purchase] User mismatch: token=${userId}, session=${sessionUserId}`);
      return new Response(
        JSON.stringify({ success: false, error: "User mismatch" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Use the Stripe metadata user_id (trusted, set during checkout creation)
    const resolvedUserId = sessionUserId;

    const paymentIntentId = session.payment_intent as string;
    const packageAmount = parseInt(session.metadata?.package_amount || "0");

    // Idempotency check — already credited?
    const { data: existingTx } = await supabase
      .from("barber_bucks_transactions")
      .select("id, amount")
      .eq("stripe_payment_id", paymentIntentId)
      .maybeSingle();

    if (existingTx) {
      console.log(`[verify-bb-purchase] Already credited tx ${existingTx.id}, returning existing`);
      const { data: profile } = await supabase
        .from("profiles")
        .select("barber_bucks")
        .eq("user_id", resolvedUserId)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          already_credited: true,
          bb_credited: existingTx.amount,
          new_balance: profile?.barber_bucks ?? 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve package
    const bbPackage = BB_PACKAGES[packageAmount];
    if (!bbPackage) {
      console.error(`[verify-bb-purchase] Invalid package_amount: ${packageAmount}`);
      throw new Error(`Invalid package amount: ${packageAmount}`);
    }

    const totalBB = bbPackage.bb + bbPackage.bonus;

    // Get current balance
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("barber_bucks")
      .eq("user_id", resolvedUserId)
      .single();

    const currentBalance = currentProfile?.barber_bucks ?? 0;
    const newBalance = currentBalance + totalBB;

    // Insert transaction record
    const { error: txError } = await supabase
      .from("barber_bucks_transactions")
      .insert({
        user_id: resolvedUserId,
        amount: totalBB,
        transaction_type: "purchase",
        description: `Purchased ${bbPackage.display}`,
        stripe_payment_id: paymentIntentId,
        balance_after: newBalance,
      });

    if (txError) {
      console.error("[verify-bb-purchase] Transaction insert failed:", txError);
      throw new Error("Failed to record transaction");
    }

    // Update profile balance
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ barber_bucks: newBalance })
      .eq("user_id", resolvedUserId);

    if (updateError) {
      console.error("[verify-bb-purchase] Profile update failed:", updateError);
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id: resolvedUserId,
      type: "bb_purchase",
      title: "Barber Bucks Purchased! 💰",
      message: `You received ${totalBB} Barber Bucks. New balance: ${newBalance} BB`,
      data: { amount: totalBB, balance: newBalance },
    });

    console.log(`[verify-bb-purchase] Credited ${totalBB} BB to user ${resolvedUserId}. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        already_credited: false,
        bb_credited: totalBB,
        new_balance: newBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[verify-bb-purchase] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
