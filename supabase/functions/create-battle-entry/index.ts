import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BATTLE-ENTRY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const body = await req.json();
    const { amount = 5000, category = 'general', barber_profile_id, country_code } = body;

    // Input validation
    if (!barber_profile_id || typeof barber_profile_id !== 'string') {
      throw new Error("barber_profile_id is required");
    }
    if (!country_code || typeof country_code !== 'string' || country_code.length > 5) {
      throw new Error("country_code is required and must be valid");
    }

    const VALID_CATEGORIES = [
      'speed_fade', 'gentleman_cut', 'creative_color',
      'viral_styles', 'beard_scissor', 'general', 'open'
    ];
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (typeof amount !== 'number' || amount < 100 || amount > 1000000) {
      throw new Error("Amount must be between $1.00 and $10,000.00");
    }

    // Verify barber_profile_id exists
    const { data: barberProfile } = await supabaseClient
      .from('barber_profiles')
      .select('id')
      .eq('id', barber_profile_id)
      .single();
    if (!barberProfile) throw new Error("Invalid barber profile");

    logStep("Request body parsed", { amount, category, barber_profile_id, country_code });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Barber Battle Tournament Entry",
              description: `Tournament entry for ${category} category`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-canceled`,
      metadata: {
        user_id: user.id,
        product_type: 'tournament_entry',
        category: category,
        barber_profile_id: barber_profile_id,
        country_code: country_code
      }
    });

    logStep("Stripe session created", { sessionId: session.id, url: session.url });

    // Create order record in database
    const { error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        amount: amount,
        currency: 'usd',
        status: 'pending',
        product_type: 'tournament_entry',
        metadata: {
          category: category,
          tournament_entry: true,
          barber_profile_id: barber_profile_id,
          country_code: country_code
        }
      });

    if (orderError) {
      logStep("Error creating order record", { error: orderError });
      throw new Error(`Failed to create order record: ${orderError.message}`);
    }

    logStep("Order record created successfully");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-battle-entry", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});