import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get caller from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { appointment_id, star_rating, comment, tags } = await req.json();

    // Validate inputs
    if (!appointment_id || !star_rating || star_rating < 1 || star_rating > 5) {
      return new Response(JSON.stringify({ error: "Invalid input: appointment_id and star_rating (1-5) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify appointment exists, is completed, and user is a participant
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("id, client_id, barber_user_id, status")
      .eq("id", appointment_id)
      .single();

    if (apptError || !appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (appointment.status !== "completed") {
      return new Response(JSON.stringify({ error: "Appointment is not completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isClient = user.id === appointment.client_id;
    const isBarber = user.id === appointment.barber_user_id;

    if (!isClient && !isBarber) {
      return new Response(JSON.stringify({ error: "You are not a participant of this appointment" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine reviewee and internal flag
    const reviewee_id = isClient ? appointment.barber_user_id : appointment.client_id;
    const is_internal_only = isBarber; // Barber reviews of clients are internal

    // Check for existing review
    const { data: existing } = await supabase
      .from("appointment_reviews")
      .select("id")
      .eq("appointment_id", appointment_id)
      .eq("reviewer_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "You have already reviewed this appointment" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert review
    const { data: review, error: reviewError } = await supabase
      .from("appointment_reviews")
      .insert({
        appointment_id,
        reviewer_id: user.id,
        reviewee_id,
        star_rating,
        comment: comment ? String(comment).substring(0, 500) : null,
        is_internal_only,
      })
      .select("id")
      .single();

    if (reviewError) {
      console.error("Review insert error:", reviewError);
      return new Response(JSON.stringify({ error: "Failed to submit review" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert tags if provided
    if (Array.isArray(tags) && tags.length > 0) {
      const tagRows = tags.slice(0, 10).map((t: { slug: string; is_negative?: boolean; is_internal?: boolean }) => ({
        review_id: review.id,
        tag_slug: String(t.slug).substring(0, 50),
        is_negative: !!t.is_negative,
        is_internal_only: is_internal_only || !!t.is_internal,
      }));

      const { error: tagError } = await supabase.from("review_tags").insert(tagRows);
      if (tagError) {
        console.error("Tag insert error:", tagError);
      }
    }

    // Log for Anti-Gravity audit
    await supabase.from("admin_action_logs").insert({
      admin_id: user.id,
      action_type: "review_submitted",
      entity_type: "appointment_review",
      entity_id: review.id,
      details: { appointment_id, star_rating, is_internal_only, tag_count: tags?.length || 0 },
    });

    return new Response(JSON.stringify({ success: true, review_id: review.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-review error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
