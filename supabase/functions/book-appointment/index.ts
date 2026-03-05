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
    const {
      barber_id,
      barber_user_id,
      service_id,
      appointment_type,
      scheduled_at,
      duration_minutes = 30,
      escrow_amount_bb,
      client_location_text,
      client_lat,
      client_lng,
      notes,
    } = body;

    if (!barber_id || !barber_user_id || !appointment_type || !scheduled_at) {
      throw new Error("Missing required fields");
    }

    // Look up service for deposit/free-intro logic
    let depositAmount = escrow_amount_bb || 0;
    let isDepositOnly = false;
    let remainderBb = 0;

    if (service_id) {
      const { data: service } = await supabase
        .from("barber_services")
        .select("price_bb, deposit_bb, is_free_intro")
        .eq("id", service_id)
        .single();

      if (service) {
        if (service.is_free_intro) {
          // Free intro: no escrow
          depositAmount = 0;
          isDepositOnly = false;
          remainderBb = 0;
        } else if (service.deposit_bb > 0 && service.deposit_bb < service.price_bb) {
          // Deposit-only booking
          depositAmount = service.deposit_bb;
          isDepositOnly = true;
          remainderBb = service.price_bb - service.deposit_bb;
        }
      }
    }

    // SOS: enforce minimum 500 BB and 2x multiplier
    const sos_multiplier = appointment_type === "sos" ? 2.0 : 1.0;
    if (appointment_type === "sos") {
      depositAmount = Math.max(depositAmount, 500);
    }
    if ((appointment_type === "house_call") && depositAmount < 500) {
      depositAmount = Math.max(escrow_amount_bb || 0, 500);
    }

    // Check client BB balance (skip if free)
    if (depositAmount > 0) {
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("barber_bucks")
        .eq("user_id", user.id)
        .single();

      const clientBalance = clientProfile?.barber_bucks || 0;
      if (clientBalance < depositAmount) {
        return new Response(
          JSON.stringify({ error: "Insufficient Barber Bucks", balance: clientBalance, required: depositAmount }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct BB
      const newBalance = clientBalance - depositAmount;
      await supabase.from("profiles").update({ barber_bucks: newBalance }).eq("user_id", user.id);

      await supabase.from("barber_bucks_transactions").insert({
        user_id: user.id,
        amount: -depositAmount,
        balance_after: newBalance,
        transaction_type: isDepositOnly ? "appointment_deposit" : "appointment_escrow",
        description: isDepositOnly
          ? `Deposit for ${appointment_type} appointment (${remainderBb} BB due on arrival)`
          : `Escrow for ${appointment_type} appointment`,
      });
    }

    // Calculate platform fee (5%)
    const totalPrice = isDepositOnly ? depositAmount + remainderBb : depositAmount;
    const platformFee = Math.floor(totalPrice * 0.05);

    // Insert appointment
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        client_id: user.id,
        barber_id,
        barber_user_id,
        service_id: service_id || null,
        appointment_type,
        status: "pending",
        scheduled_at,
        duration_minutes,
        escrow_amount_bb: depositAmount,
        platform_fee_bb: platformFee,
        client_location_text: client_location_text || null,
        client_lat: client_lat || null,
        client_lng: client_lng || null,
        sos_multiplier,
        notes: notes || null,
        is_deposit_only: isDepositOnly,
        remainder_bb: remainderBb,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // SOS: auto-insert 30-min buffer blocked slots
    if (appointment_type === "sos") {
      const scheduledDate = new Date(scheduled_at);
      const bufferBefore = new Date(scheduledDate.getTime() - 30 * 60000);
      const bufferAfter = new Date(scheduledDate.getTime() + (duration_minutes + 30) * 60000);

      await supabase.from("barber_blocked_slots").insert([
        {
          barber_id,
          barber_user_id,
          blocked_start: bufferBefore.toISOString(),
          blocked_end: scheduledDate.toISOString(),
          reason: "SOS buffer (before)",
        },
        {
          barber_id,
          barber_user_id,
          blocked_start: new Date(scheduledDate.getTime() + duration_minutes * 60000).toISOString(),
          blocked_end: bufferAfter.toISOString(),
          reason: "SOS buffer (after)",
        },
      ]);
    }

    // Notify barber
    const notifTitle = appointment_type === "sos"
      ? "🚨 Emergency SOS Booking!"
      : appointment_type === "house_call"
        ? "🏠 New House Call Bounty!"
        : depositAmount === 0
          ? "🎉 Free Intro Appointment!"
          : "📅 New Appointment Request";

    await supabase.from("notifications").insert({
      user_id: barber_user_id,
      type: "new_appointment",
      title: notifTitle,
      message: `You have a new ${appointment_type.replace("_", " ")} appointment request${depositAmount > 0 ? ` for ${depositAmount} BB` : ''}${isDepositOnly ? ` (${remainderBb} BB due on arrival)` : ''}`,
      data: { appointment_id: appointment.id, appointment_type, amount_bb: depositAmount },
    });

    return new Response(
      JSON.stringify({ success: true, appointment }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
