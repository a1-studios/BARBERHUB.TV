import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { bounty_id } = await req.json();
    if (!bounty_id) throw new Error("Missing bounty_id");

    // Get barber profile
    const { data: barberProfile } = await supabase
      .from("barber_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!barberProfile) throw new Error("Only barbers can claim bounties");

    // Atomic claim: fetch and update in one step
    const { data: bounty, error: fetchError } = await supabase
      .from("house_call_bounties")
      .select("*")
      .eq("id", bounty_id)
      .eq("status", "open")
      .single();

    if (fetchError || !bounty) throw new Error("Bounty not available or already claimed");

    // Can't claim own bounty
    if (bounty.client_id === user.id) throw new Error("Cannot claim your own bounty");

    // Check expiry
    if (new Date(bounty.expires_at) < new Date()) throw new Error("Bounty has expired");

    // Create appointment from bounty
    const platformFee = Math.floor(bounty.bounty_amount_bb * 0.05);
    const scheduledAt = bounty.preferred_date || new Date(Date.now() + 2 * 60 * 60000).toISOString();

    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .insert({
        client_id: bounty.client_id,
        barber_id: barberProfile.id,
        barber_user_id: user.id,
        appointment_type: "house_call",
        status: "confirmed", // Auto-confirmed since barber initiated
        scheduled_at: scheduledAt,
        duration_minutes: 30,
        escrow_amount_bb: bounty.bounty_amount_bb,
        platform_fee_bb: platformFee,
        client_location_text: bounty.location_text,
        client_lat: bounty.location_lat || null,
        client_lng: bounty.location_lng || null,
        notes: bounty.service_description || bounty.notes || null,
      })
      .select()
      .single();

    if (apptError) throw apptError;

    // Update bounty as claimed
    const { error: claimError } = await supabase
      .from("house_call_bounties")
      .update({
        status: "claimed",
        claimed_by_barber_id: barberProfile.id,
        claimed_by_user_id: user.id,
        claimed_at: new Date().toISOString(),
        appointment_id: appointment.id,
      })
      .eq("id", bounty_id)
      .eq("status", "open"); // Extra safety: only update if still open

    if (claimError) throw claimError;

    return new Response(
      JSON.stringify({ success: true, appointment, bounty_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
