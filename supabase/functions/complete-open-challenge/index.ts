import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { challenge_id, accepter_stream_url, accepter_youtube_video_id } = await req.json();

    console.log('Processing challenge acceptance:', {
      challenge_id,
      accepter_id: user.id,
      accepter_stream_url,
      accepter_youtube_video_id
    });

    // Verify user is a barber
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'barber');

    if (!roles || roles.length === 0) {
      throw new Error('Only barbers can accept challenges');
    }

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('open_challenges')
      .select('*')
      .eq('id', challenge_id)
      .eq('status', 'waiting_for_opponent')
      .single();

    if (challengeError || !challenge) {
      throw new Error('Challenge not found or already accepted');
    }

    // Prevent accepting own challenge
    if (challenge.challenger_id === user.id) {
      throw new Error('Cannot accept your own challenge');
    }

    // Get accepter profile
    const { data: accepterProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', user.id)
      .single();

    const accepterUsername = accepterProfile?.username || accepterProfile?.display_name || 'Unknown';

    if (!challenge.battle_id) {
      return new Response(
        JSON.stringify({ error: 'Challenge has no associated battle' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Updating existing battle:', challenge.battle_id);

    // Update existing battle with barber2 details and set battle_type to challenge
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .update({
        barber2_id: user.id,
        barber_2_video_url: accepter_stream_url,
        barber2_youtube_video_id: accepter_youtube_video_id,
        status: 'voting',
        voting_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        starts_at: new Date().toISOString(),
        battle_type: 'challenge'
      })
      .eq('id', challenge.battle_id)
      .select()
      .single();

    if (battleError || !battle) {
      console.error('Battle update error:', battleError);
      throw new Error('Failed to update battle');
    }

    console.log('Battle updated:', battle.id);

    // Update challenge record
    const { error: updateError } = await supabase
      .from('open_challenges')
      .update({
        status: 'completed',
        accepted_by_id: user.id,
        accepted_by_username: accepterUsername,
        accepted_at: new Date().toISOString(),
        battle_id: battle.id
      })
      .eq('id', challenge_id);

    if (updateError) {
      console.error('Challenge update error:', updateError);
    }

    // Increment total_challenges_completed in challenge_prize_pool
    const currentYear = new Date().getFullYear();
    const { data: existingPool } = await supabase
      .from('challenge_prize_pool')
      .select('id, total_challenges_completed')
      .eq('pool_year', currentYear)
      .maybeSingle();

    if (existingPool) {
      await supabase
        .from('challenge_prize_pool')
        .update({
          total_challenges_completed: (existingPool.total_challenges_completed || 0) + 1,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existingPool.id);
    }

    // Send notification to challenger
    const { error: notifError } = await supabase.rpc('create_battle_notification', {
      p_user_id: challenge.challenger_id,
      p_type: 'challenge_accepted',
      p_title: '🔥 Challenge Accepted!',
      p_message: `${accepterUsername} accepted your challenge "${challenge.title}"! The battle is now live!`,
      p_data: {
        battle_id: battle.id,
        challenge_id: challenge_id,
        accepter_username: accepterUsername
      }
    });

    if (notifError) {
      console.error('Notification error:', notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        battle_id: battle.id,
        message: 'Challenge accepted and battle created!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'An error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
