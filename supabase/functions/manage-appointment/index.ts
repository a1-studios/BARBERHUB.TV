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

    if (!appointment_id || !action) throw new Error("Missing appointment_id or action");

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

      // Transition through escrow_locked → confirmed
      await supabase.from("appointments").update({ status: "escrow_locked" }).eq("id", appointment_id);
      await supabase.from("appointments").update({ status: "confirmed" }).eq("id", appointment_id);

      await supabase.from("notifications").insert({
        user_id: appt.client_id,
        type: "appointment_accepted",
        title: "✅ Appointment Confirmed!",
        message: `Your ${appt.appointment_type.replace("_", " ")} appointment has been accepted. Credits are locked.`,
        data: { appointment_id },
      });

      return respond({ success: true, status: "confirmed" });
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
      await supabase.from("profiles").update({ barber_bucks: newBalance }).eq("user_id", appt.client_id);

      await supabase.from("barber_bucks_transactions").insert({
        user_id: appt.client_id,
        amount: appt.escrow_amount_bb,
        balance_after: newBalance,
        transaction_type: "appointment_refund",
        description: "Refund: appointment denied by barber",
        reference_id: appointment_id,
      });

      await supabase.from("appointments")
        .update({ status: "denied", denial_reason: denial_reason || "Barber declined" })
        .eq("id", appointment_id);

      await supabase.from("notifications").insert({
        user_id: appt.client_id,
        type: "appointment_denied",
        title: "❌ Appointment Denied",
        message: `Your appointment was declined. ${appt.escrow_amount_bb} BB has been refunded.`,
        data: { appointment_id, reason: denial_reason },
      });

      return respond({ success: true, status: "denied" });
    }

    // ---- COMPLETE ----
    if (action === "complete") {
      if (appt.barber_user_id !== user.id) throw new Error("Only the barber can complete");
      if (appt.status !== "confirmed" && appt.status !== "in_transit") throw new Error("Appointment must be confirmed first");

      let totalEscrow = appt.escrow_amount_bb;

      // If deposit-only, collect remainder from client
      if (appt.is_deposit_only && appt.remainder_bb > 0) {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("barber_bucks")
          .eq("user_id", appt.client_id)
          .single();

        const clientBal = clientProfile?.barber_bucks || 0;
        if (clientBal < appt.remainder_bb) {
          return new Response(
            JSON.stringify({ error: "Client has insufficient BB for remainder payment", required: appt.remainder_bb, client_balance: clientBal }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const clientNewBal = clientBal - appt.remainder_bb;
        await supabase.from("profiles").update({ barber_bucks: clientNewBal }).eq("user_id", appt.client_id);

        await supabase.from("barber_bucks_transactions").insert({
          user_id: appt.client_id,
          amount: -appt.remainder_bb,
          balance_after: clientNewBal,
          transaction_type: "appointment_remainder",
          description: "Remainder payment on completed appointment",
          reference_id: appointment_id,
        });

        totalEscrow += appt.remainder_bb;
      }

      const platformFee = appt.platform_fee_bb || Math.floor(totalEscrow * 0.05);
      const barberPayout = totalEscrow - platformFee;

      // Pay barber
      const { data: barberProfile } = await supabase
        .from("profiles")
        .select("barber_bucks")
        .eq("user_id", appt.barber_user_id)
        .single();

      const barberNewBalance = (barberProfile?.barber_bucks || 0) + barberPayout;
      await supabase.from("profiles").update({ barber_bucks: barberNewBalance }).eq("user_id", appt.barber_user_id);

      await supabase.from("barber_bucks_transactions").insert({
        user_id: appt.barber_user_id,
        amount: barberPayout,
        balance_after: barberNewBalance,
        transaction_type: "appointment_payout",
        description: `Payout for ${appt.appointment_type.replace("_", " ")} appointment`,
        reference_id: appointment_id,
      });

      // Route platform fee
      const prizePoolShare = Math.floor(platformFee / 2);
      await supabase.from("platform_transactions").insert({
        transaction_type: "appointment_fee",
        amount_cents: platformFee,
        category: "appointment",
        description: `5% fee from appointment (${prizePoolShare} BB to prize pool)`,
        source_user_id: appt.client_id,
        reference_id: appointment_id,
      });

      await supabase.from("appointments")
        .update({ status: "completed", platform_fee_bb: platformFee })
        .eq("id", appointment_id);

      // Increment client total_appointments
      await supabase.rpc("increment_client_appointments", { p_client_id: appt.client_id, p_is_no_show: false });

      await supabase.from("notifications").insert({
        user_id: appt.client_id,
        type: "appointment_completed",
        title: "✂️ Appointment Complete!",
        message: "Your appointment has been completed successfully",
        data: { appointment_id },
      });

      return respond({ success: true, status: "completed", payout: barberPayout });
    }

    // ---- NO SHOW ----
    if (action === "no_show") {
      if (appt.barber_user_id !== user.id) throw new Error("Only the barber can mark no-show");
      if (!["confirmed", "in_transit"].includes(appt.status)) throw new Error("Appointment must be confirmed to mark no-show");

      // Look up barber's default no-show fee
      const { data: barberSettings } = await supabase
        .from("barber_profiles")
        .select("default_no_show_fee_bb")
        .eq("user_id", user.id)
        .single();

      const noShowFee = barberSettings?.default_no_show_fee_bb ?? 50;
      
      // Use escrow first, then deduct additional from client balance if needed
      let feeCollected = Math.min(noShowFee, appt.escrow_amount_bb);
      let additionalDeduction = 0;

      if (noShowFee > appt.escrow_amount_bb) {
        // Need to deduct additional from client wallet
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("barber_bucks")
          .eq("user_id", appt.client_id)
          .single();

        const clientBal = clientProfile?.barber_bucks || 0;
        additionalDeduction = Math.min(noShowFee - appt.escrow_amount_bb, clientBal);
        
        if (additionalDeduction > 0) {
          const clientNewBal = clientBal - additionalDeduction;
          await supabase.from("profiles").update({ barber_bucks: clientNewBal }).eq("user_id", appt.client_id);
          await supabase.from("barber_bucks_transactions").insert({
            user_id: appt.client_id,
            amount: -additionalDeduction,
            balance_after: clientNewBal,
            transaction_type: "no_show_fee",
            description: "Additional no-show fee deduction",
            reference_id: appointment_id,
          });
        }
        feeCollected = appt.escrow_amount_bb + additionalDeduction;
      }

      // Refund any escrow beyond the fee
      const escrowRefund = appt.escrow_amount_bb - Math.min(noShowFee, appt.escrow_amount_bb);
      if (escrowRefund > 0) {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("barber_bucks")
          .eq("user_id", appt.client_id)
          .single();

        const clientNewBal = (clientProfile?.barber_bucks || 0) + escrowRefund;
        await supabase.from("profiles").update({ barber_bucks: clientNewBal }).eq("user_id", appt.client_id);
        await supabase.from("barber_bucks_transactions").insert({
          user_id: appt.client_id,
          amount: escrowRefund,
          balance_after: clientNewBal,
          transaction_type: "no_show_partial_refund",
          description: "Partial escrow refund after no-show fee",
          reference_id: appointment_id,
        });
      }

      // Credit barber (minus 5% platform fee)
      const platformFee = Math.floor(feeCollected * 0.05);
      const barberPayout = feeCollected - platformFee;

      if (barberPayout > 0) {
        const { data: barberProfile } = await supabase
          .from("profiles")
          .select("barber_bucks")
          .eq("user_id", appt.barber_user_id)
          .single();

        const barberNewBal = (barberProfile?.barber_bucks || 0) + barberPayout;
        await supabase.from("profiles").update({ barber_bucks: barberNewBal }).eq("user_id", appt.barber_user_id);
        await supabase.from("barber_bucks_transactions").insert({
          user_id: appt.barber_user_id,
          amount: barberPayout,
          balance_after: barberNewBal,
          transaction_type: "no_show_compensation",
          description: "No-show fee compensation",
          reference_id: appointment_id,
        });
      }

      // Update appointment status
      await supabase.from("appointments").update({ status: "no_show" }).eq("id", appointment_id);

      // Increment client no_show_count and total_appointments
      await supabase.rpc("increment_client_appointments", { p_client_id: appt.client_id, p_is_no_show: true });

      // Notify client
      await supabase.from("notifications").insert({
        user_id: appt.client_id,
        type: "no_show",
        title: "🚫 Marked as No-Show",
        message: `You were marked as a no-show. ${feeCollected} BB fee was applied.`,
        data: { appointment_id, fee: feeCollected },
      });

      return respond({ success: true, status: "no_show", fee_collected: feeCollected });
    }

    // ---- CANCEL (by client) ----
    if (action === "cancel") {
      if (appt.client_id !== user.id) throw new Error("Only the client can cancel");
      if (["completed", "cancelled", "denied"].includes(appt.status)) {
        throw new Error("Cannot cancel this appointment");
      }

      const hoursUntil = (new Date(appt.scheduled_at).getTime() - Date.now()) / (1000 * 60 * 60);

      let refundAmount: number;
      let barberCompensation = 0;

      if (hoursUntil > 2) {
        refundAmount = appt.escrow_amount_bb;
      } else {
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
        const { data: barberProf } = await supabase
          .from("profiles")
          .select("barber_bucks")
          .eq("user_id", appt.barber_user_id)
          .single();

        const barberNewBal = (barberProf?.barber_bucks || 0) + barberCompensation;
        await supabase.from("profiles").update({ barber_bucks: barberNewBal }).eq("user_id", appt.barber_user_id);
        await supabase.from("barber_bucks_transactions").insert({
          user_id: appt.barber_user_id,
          amount: barberCompensation,
          balance_after: barberNewBal,
          transaction_type: "appointment_cancel_compensation",
          description: "Late cancellation compensation",
          reference_id: appointment_id,
        });
      }

      await supabase.from("appointments").update({ status: "cancelled" }).eq("id", appointment_id);

      // Remove SOS blocked slots if applicable
      if (appt.appointment_type === "sos") {
        await supabase.from("barber_blocked_slots")
          .delete()
          .eq("barber_id", appt.barber_id)
          .like("reason", "SOS buffer%");
      }

      return respond({ success: true, status: "cancelled", refund: refundAmount });
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  function respond(data: Record<string, any>) {
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
