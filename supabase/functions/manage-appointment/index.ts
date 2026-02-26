import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { appointment_id, action, denial_reason } = body;
    // action: 'accept' | 'deny' | 'complete' | 'cancel'

    if (!appointment_id || !action) throw new Error("Missing appointment_id or action");

    // Get appointment
    const { data: appt, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .single();

    if (fetchError || !appt) throw new Error("Appointment not found");

    // ---- ACCEPT ----
    if (action === "accept") {
      if (appt.barber_user_id !== user.id) throw new Error("Only the barber can accept");
      if (appt.status !== "pending") throw new Error("Can only accept pending appointments");

      // Check tier for house_call/sos
      if (appt.appointment_type !== "standard") {
        const { data: barber } = await supabase
          .from("barber_profiles")
          .select("active_subscription_tier")
          .eq("id", appt.barber_id)
          .single();
        const tier = barber?.active_subscription_tier;
        if (!tier || tier === "bronze") {
          return new Response(
            JSON.stringify({ error: "Upgrade to Silver+ to accept this booking", upgrade_required: true }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointment_id);

      // Notify client
      await supabase.from("notifications").insert({
        user_id: appt.client_id,
        type: "appointment_accepted",
        title: "✅ Appointment Confirmed!",
        message: `Your ${appt.appointment_type.replace("_", " ")} appointment has been accepted`,
        data: { appointment_id },
      });

      return new Response(JSON.stringify({ success: true, status: "confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- DENY ----
    if (action === "deny") {
      if (appt.barber_user_id !== user.id) throw new Error("Only the barber can deny");
      if (appt.status !== "pending") throw new Error("Can only deny pending appointments");

      // Full refund to client
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("barber_bucks")
        .eq("user_id", appt.client_id)
        .single();

      const newBalance = (clientProfile?.barber_bucks || 0) + appt.escrow_amount_bb;
      await supabase
        .from("profiles")
        .update({ barber_bucks: newBalance })
        .eq("user_id", appt.client_id);

      await supabase.from("barber_bucks_transactions").insert({
        user_id: appt.client_id,
        amount: appt.escrow_amount_bb,
        balance_after: newBalance,
        transaction_type: "appointment_refund",
        description: `Refund: appointment denied by barber`,
        reference_id: appointment_id,
      });

      await supabase
        .from("appointments")
        .update({ status: "denied", denial_reason: denial_reason || "Barber declined" })
        .eq("id", appointment_id);

      await supabase.from("notifications").insert({
        user_id: appt.client_id,
        type: "appointment_denied",
        title: "❌ Appointment Denied",
        message: `Your appointment was declined. ${appt.escrow_amount_bb} BB has been refunded.`,
        data: { appointment_id, reason: denial_reason },
      });

      return new Response(JSON.stringify({ success: true, status: "denied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- COMPLETE ----
    if (action === "complete") {
      if (appt.barber_user_id !== user.id) throw new Error("Only the barber can complete");
      if (appt.status !== "confirmed" && appt.status !== "in_transit") throw new Error("Appointment must be confirmed first");

      const platformFee = appt.platform_fee_bb || Math.floor(appt.escrow_amount_bb * 0.05);
      const barberPayout = appt.escrow_amount_bb - platformFee;

      // Pay barber
      const { data: barberProfile } = await supabase
        .from("profiles")
        .select("barber_bucks")
        .eq("user_id", appt.barber_user_id)
        .single();

      const barberNewBalance = (barberProfile?.barber_bucks || 0) + barberPayout;
      await supabase
        .from("profiles")
        .update({ barber_bucks: barberNewBalance })
        .eq("user_id", appt.barber_user_id);

      await supabase.from("barber_bucks_transactions").insert({
        user_id: appt.barber_user_id,
        amount: barberPayout,
        balance_after: barberNewBalance,
        transaction_type: "appointment_payout",
        description: `Payout for ${appt.appointment_type.replace("_", " ")} appointment`,
        reference_id: appointment_id,
      });

      // Route platform fee: 50% prize pool, 50% platform
      const prizePoolShare = Math.floor(platformFee / 2);
      await supabase.from("platform_transactions").insert({
        transaction_type: "appointment_fee",
        amount_cents: platformFee,
        category: "appointment",
        description: `5% fee from appointment (${prizePoolShare} BB to prize pool)`,
        source_user_id: appt.client_id,
        reference_id: appointment_id,
      });

      await supabase
        .from("appointments")
        .update({ status: "completed", platform_fee_bb: platformFee })
        .eq("id", appointment_id);

      await supabase.from("notifications").insert({
        user_id: appt.client_id,
        type: "appointment_completed",
        title: "✂️ Appointment Complete!",
        message: `Your appointment has been completed successfully`,
        data: { appointment_id },
      });

      return new Response(JSON.stringify({ success: true, status: "completed", payout: barberPayout }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- CANCEL (by client) ----
    if (action === "cancel") {
      if (appt.client_id !== user.id) throw new Error("Only the client can cancel");
      if (appt.status === "completed" || appt.status === "cancelled" || appt.status === "denied") {
        throw new Error("Cannot cancel this appointment");
      }

      const scheduledTime = new Date(appt.scheduled_at).getTime();
      const now = Date.now();
      const hoursUntil = (scheduledTime - now) / (1000 * 60 * 60);

      let refundAmount: number;
      let barberCompensation = 0;

      if (hoursUntil > 2) {
        // Full refund
        refundAmount = appt.escrow_amount_bb;
      } else {
        // 50% refund, 50% to barber
        refundAmount = Math.floor(appt.escrow_amount_bb / 2);
        barberCompensation = appt.escrow_amount_bb - refundAmount;
      }

      // Refund client
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("barber_bucks")
        .eq("user_id", appt.client_id)
        .single();

      const clientNewBalance = (clientProfile?.barber_bucks || 0) + refundAmount;
      await supabase.from("profiles").update({ barber_bucks: clientNewBalance }).eq("user_id", appt.client_id);
      await supabase.from("barber_bucks_transactions").insert({
        user_id: appt.client_id,
        amount: refundAmount,
        balance_after: clientNewBalance,
        transaction_type: "appointment_cancel_refund",
        description: `Cancellation refund (${hoursUntil > 2 ? "full" : "50%"})`,
        reference_id: appointment_id,
      });

      // Compensate barber if late cancel
      if (barberCompensation > 0) {
        const { data: barberProfile } = await supabase
          .from("profiles")
          .select("barber_bucks")
          .eq("user_id", appt.barber_user_id)
          .single();

        const barberNewBal = (barberProfile?.barber_bucks || 0) + barberCompensation;
        await supabase.from("profiles").update({ barber_bucks: barberNewBal }).eq("user_id", appt.barber_user_id);
        await supabase.from("barber_bucks_transactions").insert({
          user_id: appt.barber_user_id,
          amount: barberCompensation,
          balance_after: barberNewBal,
          transaction_type: "appointment_cancel_compensation",
          description: `Late cancellation compensation`,
          reference_id: appointment_id,
        });
      }

      await supabase.from("appointments").update({ status: "cancelled" }).eq("id", appointment_id);

      // Remove SOS blocked slots if applicable
      if (appt.appointment_type === "sos") {
        await supabase
          .from("barber_blocked_slots")
          .delete()
          .eq("barber_id", appt.barber_id)
          .like("reason", "SOS buffer%");
      }

      return new Response(JSON.stringify({ success: true, status: "cancelled", refund: refundAmount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
