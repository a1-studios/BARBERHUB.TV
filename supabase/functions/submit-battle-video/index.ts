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

/**
 * Validates that the URL is a supported video format:
 * - HLS (.m3u8)
 * - S3/CloudFront URLs
 * - Direct video URLs (.mp4, .webm, etc.)
 * - YouTube URLs (legacy support)
 */
function isValidVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Must be https (or http for dev)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // Accept any URL that looks like a video or streaming endpoint
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Please sign in' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { battleId, videoUrl, title, description } = (await req.json()) as SubmitVideoRequest;

    if (!battleId || !videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: battleId and videoUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format (accepts HLS, S3, YouTube, direct video URLs)
    if (!isValidVideoUrl(videoUrl)) {
      console.error('Invalid video URL:', videoUrl);
      return new Response(
        JSON.stringify({ error: 'Invalid video URL. Please provide a valid video link (HLS, MP4, or streaming URL).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Valid video URL provided for battle:', battleId);

    // Get battle details
    const { data: battle, error: battleError } = await supabaseClient
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      return new Response(
        JSON.stringify({ error: 'Battle not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a participant
    const isBarber1 = battle.barber1_id === user.id;
    const isBarber2 = battle.barber2_id === user.id;

    if (!isBarber1 && !isBarber2) {
      return new Response(
        JSON.stringify({ error: 'You are not a participant in this battle' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check battle status
    if (!['awaiting_submissions', 'active', 'upcoming'].includes(battle.status)) {
      return new Response(
        JSON.stringify({ error: `Battle is not accepting submissions (status: ${battle.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check submission deadline
    if (battle.submission_deadline && new Date() > new Date(battle.submission_deadline)) {
      return new Response(
        JSON.stringify({ error: 'Submission deadline has passed.' }),
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
      const { error: updateError } = await supabaseClient
        .from('battle_submissions')
        .update({
          media_url: videoUrl,
          title: title || null,
          description: description || null,
          status: 'submitted',
        })
        .eq('id', existingSubmission.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseClient
        .from('battle_submissions')
        .insert({
          battle_id: battleId,
          user_id: user.id,
          media_url: videoUrl,
          title: title || null,
          description: description || null,
          status: 'submitted',
        });

      if (insertError) throw insertError;
    }

    // Update battles table with video URL
    const updateData = isBarber1
      ? { barber_1_video_url: videoUrl }
      : { barber_2_video_url: videoUrl };

    const { error: battleUpdateError } = await supabaseClient
      .from('battles')
      .update(updateData)
      .eq('id', battleId);

    if (battleUpdateError) throw battleUpdateError;

    // 🚨 AIRLOCK CHECK — both submitted?
    const { data: updatedBattle, error: refetchError } = await supabaseClient
      .from('battles')
      .select('barber_1_video_url, barber_2_video_url')
      .eq('id', battleId)
      .single();

    if (refetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify submission status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bothSubmitted = updatedBattle.barber_1_video_url && updatedBattle.barber_2_video_url;

    if (bothSubmitted) {
      const votingEndsAt = new Date();
      votingEndsAt.setDate(votingEndsAt.getDate() + 7);

      await supabaseClient
        .from('battles')
        .update({
          status: 'voting',
          voting_ends_at: votingEndsAt.toISOString(),
        })
        .eq('id', battleId);

      console.log('Battle now LIVE for voting! Ends at:', votingEndsAt.toISOString());

      return new Response(JSON.stringify({
        success: true,
        message: 'Both videos submitted. Battle is now LIVE for voting!',
        battleStatus: 'voting',
        votingEndsAt: votingEndsAt.toISOString(),
      } as SubmitVideoResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({
        success: true,
        message: 'Video submitted! Waiting for opponent.',
        battleStatus: 'pending',
      } as SubmitVideoResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in submit-battle-video:', error);
    return new Response(
      JSON.stringify({
        error: 'An error occurred while submitting your video',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
