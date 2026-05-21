import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

/**
 * Send Match SMS — Notifies both barbers via Twilio when a match is executed.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    if (!TWILIO_API_KEY) throw new Error('TWILIO_API_KEY is not configured — connect Twilio first');

    const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER');
    if (!TWILIO_FROM_NUMBER) throw new Error('TWILIO_FROM_NUMBER is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { battle_id, barber1_user_id, barber2_user_id } = await req.json();

    if (!battle_id) throw new Error('battle_id is required');

    // Get phone numbers for both barbers
    const phoneNumbers: string[] = [];
    const barberIds = [barber1_user_id, barber2_user_id].filter(Boolean);

    for (const barberId of barberIds) {
      const { data: contact } = await supabase
        .from('user_private_contacts')
        .select('phone_number')
        .eq('user_id', barberId)
        .maybeSingle();

      if (contact?.phone_number) {
        phoneNumbers.push(contact.phone_number);
      }
    }


    if (phoneNumbers.length === 0) {
      console.log('[SEND-MATCH-SMS] No phone numbers found for barbers');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No phone numbers available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const message = 'BarberHub Arena: Your international opponent is ready. Step into the Arena. 🏆✂️';
    let sent = 0;

    for (const phone of phoneNumbers) {
      try {
        const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TWILIO_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: phone,
            From: TWILIO_FROM_NUMBER,
            Body: message,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          console.error(`[SEND-MATCH-SMS] Twilio error for ${phone}:`, data);
        } else {
          sent++;
          console.log(`[SEND-MATCH-SMS] Sent to ${phone}: ${data.sid}`);
        }
      } catch (smsErr) {
        console.error(`[SEND-MATCH-SMS] Failed to send to ${phone}:`, smsErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: phoneNumbers.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[SEND-MATCH-SMS] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to send SMS' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
