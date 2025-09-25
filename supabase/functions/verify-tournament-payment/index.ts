import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      payment_status: string;
      metadata: {
        user_id?: string;
        product_type?: string;
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    if (!signature) {
      console.error('No stripe signature found');
      return new Response('No signature', { status: 400 });
    }

    // Verify webhook signature
    let event: StripeEvent;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
      ) as StripeEvent;
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(`Webhook Error: ${err}`, { status: 400 });
    }

    console.log('Received Stripe event:', event.type);

    // Handle successful checkout for tournament entry
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      console.log('Processing tournament payment for session:', session.id);

      if (session.payment_status === 'paid') {
        const metadata = session.metadata || {};
        
        if (metadata.product_type === 'tournament_entry') {
          const userId = metadata.user_id;
          
          if (!userId) {
            console.error('No user_id found in session metadata');
            return new Response('No user ID found', { status: 400 });
          }

          // Calculate expiration date (12 months from now)
          const expirationDate = new Date();
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);

          // Update user's verification status and 3x vote power
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              is_verified_by_competition: true,
              three_x_vote_expires_at: expirationDate.toISOString(),
            })
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating user verification status:', updateError);
            return new Response('Database update failed', { status: 500 });
          }

          // Update order status
          const { error: orderError } = await supabase
            .from('orders')
            .update({ status: 'completed' })
            .eq('stripe_session_id', session.id);

          if (orderError) {
            console.error('Error updating order status:', orderError);
          }

          console.log(`Successfully verified user ${userId} for tournament entry`);
          
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'User verification status updated successfully',
            user_id: userId,
            expires_at: expirationDate.toISOString()
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-tournament-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});