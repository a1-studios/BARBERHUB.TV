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
      appointment_type, // 'standard' | 'house_call' | 'sos'
      scheduled_at,
      duration_minutes = 30,
      escrow_amount_bb,
      client_location_text,
      client_lat,
      client_lng,
      notes,
    } = body;

    // 1. Validate required fields
    if (!barber_id || !barber_user_id || !appointment_type || !scheduled_at || !escrow_amount_bb) {
      throw new Error("Missing required fields");
    }

    // 2. Tier gate: check barber subscription for house_call / sos
    if (appointment_type !== "standard") {
      const { data: barber } = await supabase
        .from("barber_profiles")
        .select("active_subscription_tier")
        .eq("id", barber_id)
        .single();

      const tier = barber?.active_subscription_tier;
      if (!tier || tier === "bronze") {
        return new Response(
          JSON.stringify({ error: "This barber needs Silver+ subscription to accept House Calls and SOS cuts. They need to upgrade first.", upgrade_required: true }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Enforce minimum 500 BB for house_call and sos
    if ((appointment_type === "house_call" || appointment_type === "sos") && escrow_amount_bb < 500) {
      throw new Error("Minimum 500 BB required for House Calls and SOS cuts");
    }

    // 4. Calculate SOS multiplier
    const sos_multiplier = appointment_type === "sos" ? 2.0 : 1.0;
    const finalAmount = appointment_type === "sos" ? Math.max(escrow_amount_bb, 500) : escrow_amount_bb;

    // 5. Check client BB balance
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("barber_bucks")
      .eq("user_id", user.id)
      .single();

    const clientBalance = clientProfile?.barber_bucks || 0;
    if (clientBalance < finalAmount) {
      return new Response(
        JSON.stringify({ error: "Insufficient Barber Bucks", balance: clientBalance, required: finalAmount }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Deduct BB from client
    const newBalance = clientBalance - finalAmount;
    await supabase
      .from("profiles")
      .update({ barber_bucks: newBalance })
      .eq("user_id", user.id);

    // 7. Record escrow transaction
    await supabase.from("barber_bucks_transactions").insert({
      user_id: user.id,
      amount: -finalAmount,
      balance_after: newBalance,
      transaction_type: "appointment_escrow",
      description: `Escrow for ${appointment_type} appointment`,
    });

    // 8. Calculate platform fee (5%)
    const platformFee = Math.floor(finalAmount * 0.05);

    // 9. Insert appointment
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
        escrow_amount_bb: finalAmount,
        platform_fee_bb: platformFee,
        client_location_text: client_location_text || null,
        client_lat: client_lat || null,
        client_lng: client_lng || null,
        sos_multiplier,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 10. For SOS: auto-insert 30-min buffer blocked slots
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

    // 11. Notify barber
    await supabase.from("notifications").insert({
      user_id: barber_user_id,
      type: "new_appointment",
      title: appointment_type === "sos" ? "🚨 Emergency SOS Booking!" : appointment_type === "house_call" ? "🏠 New House Call Bounty!" : "📅 New Appointment Request",
      message: `You have a new ${appointment_type.replace("_", " ")} appointment request for ${finalAmount} BB`,
      data: { appointment_id: appointment.id, appointment_type, amount_bb: finalAmount },
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
