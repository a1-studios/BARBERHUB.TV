import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitVideoRequest {
  battleId: string;
  videoUrl: string;
  title?: string;
  description?: string;
}

interface SubmitVideoResponse {
  success: boolean;
  message: string;
  battleStatus: 'pending' | 'voting';
  votingEndsAt?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Please sign in' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const { battleId, videoUrl, title, description } = (await req.json()) as SubmitVideoRequest;

    if (!battleId || !videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: battleId and videoUrl' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    if (!youtubeRegex.test(videoUrl)) {
      console.error('Invalid YouTube URL:', videoUrl);
      return new Response(
        JSON.stringify({ error: 'Invalid YouTube URL. Please provide a valid YouTube video link.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Valid YouTube URL provided for battle:', battleId);

    // Get battle details and verify user is a participant
    const { data: battle, error: battleError } = await supabaseClient
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      console.error('Battle not found:', battleError);
      return new Response(
        JSON.stringify({ error: 'Battle not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user is a participant
    const isBarber1 = battle.barber1_id === user.id;
    const isBarber2 = battle.barber2_id === user.id;

    if (!isBarber1 && !isBarber2) {
      console.error('User not a participant. User:', user.id, 'Battle barbers:', battle.barber1_id, battle.barber2_id);
      return new Response(
        JSON.stringify({ error: 'You are not a participant in this battle' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User verified as participant:', isBarber1 ? 'Barber 1' : 'Barber 2');

    // Check if battle is in correct status
    if (battle.status !== 'awaiting_submissions' && battle.status !== 'active' && battle.status !== 'upcoming') {
      console.error('Battle not in valid status for submissions:', battle.status);
      return new Response(
        JSON.stringify({ error: `Battle is not accepting submissions (status: ${battle.status})` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if submission deadline has passed
    if (battle.submission_deadline && new Date() > new Date(battle.submission_deadline)) {
      console.error('Submission deadline passed:', battle.submission_deadline);
      return new Response(
        JSON.stringify({ 
          error: 'Submission deadline has passed. This battle has been forfeited.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing submission
    const { data: existingSubmission } = await supabaseClient
      .from('battle_submissions')
      .select('id')
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .single();

    if (existingSubmission) {
      // Update existing submission
      console.log('Updating existing submission:', existingSubmission.id);
      const { error: updateError } = await supabaseClient
        .from('battle_submissions')
        .update({
          youtube_vod_url: videoUrl,
          media_url: videoUrl,
          title: title || null,
          description: description || null,
          status: 'submitted',
        })
        .eq('id', existingSubmission.id);

      if (updateError) {
        console.error('Error updating submission:', updateError);
        throw updateError;
      }
    } else {
      // Create new submission
      console.log('Creating new submission for user:', user.id);
      const { error: insertError } = await supabaseClient
        .from('battle_submissions')
        .insert({
          battle_id: battleId,
          user_id: user.id,
          youtube_vod_url: videoUrl,
          media_url: videoUrl,
          title: title || null,
          description: description || null,
          status: 'submitted',
        });

      if (insertError) {
        console.error('Error creating submission:', insertError);
        throw insertError;
      }
    }

    // Update battles table with video URL in appropriate column
    const updateData = isBarber1
      ? { barber_1_video_url: videoUrl }
      : { barber_2_video_url: videoUrl };

    console.log('Updating battle with video URL:', updateData);

    const { error: battleUpdateError } = await supabaseClient
      .from('battles')
      .update(updateData)
      .eq('id', battleId);

    if (battleUpdateError) {
      console.error('Error updating battle:', battleUpdateError);
      throw battleUpdateError;
    }

    // 🚨 THE AIRLOCK CHECK 🚨
    // Re-query the battle to check if BOTH barbers have submitted
    console.log('🔍 AIRLOCK CHECK: Verifying if both barbers have submitted...');

    const { data: updatedBattle, error: refetchError } = await supabaseClient
      .from('battles')
      .select('barber_1_video_url, barber_2_video_url, barber1_id, barber2_id')
      .eq('id', battleId)
      .single();

    if (refetchError) {
      console.error('Error refetching battle:', refetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify submission status' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if both videos are submitted
    const bothSubmitted =
      updatedBattle.barber_1_video_url && updatedBattle.barber_2_video_url;

    if (bothSubmitted) {
      // 🎉 BOTH SUBMITTED - OPEN THE AIRLOCK!
      console.log('✅ AIRLOCK OPENING: Both barbers have submitted! Activating voting...');

      const votingEndsAt = new Date();
      votingEndsAt.setDate(votingEndsAt.getDate() + 7); // 7 days from now

      const { error: statusUpdateError } = await supabaseClient
        .from('battles')
        .update({
          status: 'voting',
          voting_ends_at: votingEndsAt.toISOString(),
        })
        .eq('id', battleId);

      if (statusUpdateError) {
        console.error('Error updating battle status to voting:', statusUpdateError);
        throw statusUpdateError;
      }

      console.log('🎊 Battle now LIVE for voting! Ends at:', votingEndsAt.toISOString());

      const response: SubmitVideoResponse = {
        success: true,
        message: 'Success! Both videos submitted. Your battle is now LIVE for voting!',
        battleStatus: 'voting',
        votingEndsAt: votingEndsAt.toISOString(),
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // 🕐 WAITING FOR OPPONENT
      console.log('⏳ Waiting for opponent to submit their video...');

      const response: SubmitVideoResponse = {
        success: true,
        message: 'Video submitted! Waiting for your opponent. Voting begins once they submit.',
        battleStatus: 'pending',
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in submit-battle-video function:', error);
    return new Response(
      JSON.stringify({
        error: 'An error occurred while submitting your video',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
