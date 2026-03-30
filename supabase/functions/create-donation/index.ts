import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-DONATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use the service role key to perform writes (bypassing RLS)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email || !user?.id) throw new Error("User not authenticated or missing data");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { creator_id, amount_cents, currency = 'usd', message } = await req.json();
    
    if (!creator_id || typeof creator_id !== 'string') {
      throw new Error("Missing required field: creator_id");
    }
    if (typeof amount_cents !== 'number' || !Number.isInteger(amount_cents)) {
      throw new Error("amount_cents must be an integer");
    }
    if (amount_cents < 100 || amount_cents > 100000) {
      throw new Error("Donation must be between $1.00 and $1,000.00");
    }

    const VALID_CURRENCIES = ['usd'];
    if (!VALID_CURRENCIES.includes(currency)) {
      throw new Error("Invalid currency");
    }

    // Sanitize and validate message
    const sanitizedMessage = message
      ? String(message).replace(/<[^>]*>/g, '').slice(0, 500)
      : undefined;

    logStep("Donation request", { creator_id, amount_cents, currency, message: sanitizedMessage });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Create donation record first
    const { data: donationData, error: donationError } = await supabaseClient
      .from('donations')
      .insert({
        fan_id: user.id,
        creator_id,
        amount_cents,
        currency,
        message,
        status: 'pending'
      })
      .select()
      .single();

    if (donationError) throw new Error(`Failed to create donation record: ${donationError.message}`);
    logStep("Created donation record", { donationId: donationData.id });

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Donation to Creator`,
              description: message ? `Message: ${message}` : undefined,
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/battles?donation=success`,
      cancel_url: `${origin}/battles?donation=canceled`,
      metadata: {
        donation_id: donationData.id,
        creator_id,
        fan_id: user.id
      }
    });

    // Update donation record with Stripe session ID
    await supabaseClient
      .from('donations')
      .update({ stripe_session_id: session.id })
      .eq('id', donationData.id);

    logStep("Created Stripe session", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, donation_id: donationData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-donation", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});