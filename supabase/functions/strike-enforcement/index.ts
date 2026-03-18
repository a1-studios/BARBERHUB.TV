import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIKE_THRESHOLD = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find barbers with 3+ no-shows who still have active tournament registrations
    const { data: offenders, error } = await supabase
      .from("barber_profiles")
      .select("id, user_id, no_show_count, name")
      .gte("no_show_count", STRIKE_THRESHOLD);

    if (error) throw error;

    let disqualified = 0;

    for (const barber of offenders || []) {
      // Remove from any pending tournament registrations
      const { data: registrations } = await supabase
        .from("battle_participants")
        .select("id, battle_id, tournament_id")
        .eq("user_id", barber.user_id)
        .eq("status", "registered");

      if (registrations && registrations.length > 0) {
        // Mark as disqualified
        await supabase
          .from("battle_participants")
          .update({ status: "disqualified" })
          .eq("user_id", barber.user_id)
          .eq("status", "registered");

        // Notify barber
        await supabase.from("notifications").insert({
          user_id: barber.user_id,
          type: "strike_disqualification",
          title: "🚫 Tournament Disqualification",
          message: `You've been removed from ${registrations.length} tournament(s) due to ${barber.no_show_count} no-shows. Contact support to appeal.`,
          data: {
            no_show_count: barber.no_show_count,
            removed_from: registrations.length,
          },
        });

        disqualified++;
      }
    }

    console.log(`Strike enforcement: ${offenders?.length || 0} offenders found, ${disqualified} disqualified`);

    return new Response(
      JSON.stringify({
        success: true,
        offenders_found: offenders?.length || 0,
        disqualified,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in strike-enforcement:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
