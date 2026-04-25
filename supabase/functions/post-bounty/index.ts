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

    const body = await req.json();
    const {
      location_text,
      location_lat,
      location_lng,
      service_description,
      bounty_amount_bb,
      preferred_date,
      notes,
    } = body;

    if (!location_text || !bounty_amount_bb) throw new Error("Missing required fields");
    if (bounty_amount_bb < 500) throw new Error("Minimum bounty is 500 BB");

    // Check client balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("barber_bucks")
      .eq("user_id", user.id)
      .single();

    const balance = profile?.barber_bucks || 0;
    if (balance < bounty_amount_bb) {
      return new Response(
        JSON.stringify({ error: "Insufficient Barber Bucks", balance, required: bounty_amount_bb }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct BB (escrow)
    const newBalance = balance - bounty_amount_bb;
    await supabase.from("profiles").update({ barber_bucks: newBalance }).eq("user_id", user.id);

    await supabase.from("barber_bucks_transactions").insert({
      user_id: user.id,
      amount: -bounty_amount_bb,
      balance_after: newBalance,
      transaction_type: "bounty_escrow",
      description: `Escrow for house call bounty`,
    });

    // Insert bounty
    const { data: bounty, error: insertError } = await supabase
      .from("house_call_bounties")
      .insert({
        client_id: user.id,
        location_text,
        location_lat: location_lat || null,
        location_lng: location_lng || null,
        service_description: service_description || null,
        bounty_amount_bb,
        preferred_date: preferred_date || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, bounty }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
