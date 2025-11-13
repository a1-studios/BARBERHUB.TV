import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("Missing session_id");
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Get metadata from session
    const metadata = session.metadata || {};
    const barberProfileId = metadata.barber_profile_id;
    const category = metadata.category;
    const countryCode = metadata.country_code;
    const userId = metadata.user_id;

    if (!barberProfileId || !category || !countryCode || !userId) {
      throw new Error("Missing required metadata");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update order status
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("stripe_session_id", session_id);

    if (orderError) {
      console.error("Error updating order:", orderError);
    }

    // Add entry to tournament_queue
    const { data: queueEntry, error: queueError } = await supabase
      .from("tournament_queue")
      .insert({
        user_id: userId,
        barber_profile_id: barberProfileId,
        category: category,
        country_code: countryCode,
        status: "waiting",
        payment_id: session_id,
      })
      .select()
      .single();

    if (queueError) {
      console.error("Error creating queue entry:", queueError);
      throw queueError;
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "tournament_entry",
      title: "Tournament Entry Confirmed! 🎉",
      message: `You've successfully joined the ${category} tournament queue. We'll notify you when an opponent is found!`,
      data: {
        queue_id: queueEntry.id,
        category: category,
        session_id: session_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        queue_entry: queueEntry,
        message: "Payment verified and added to tournament queue",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
