import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting YouTube live status check...');

    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    // Create Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all barbers with YouTube channel IDs
    const { data: barbers, error: fetchError } = await supabase
      .from('barber_profiles')
      .select('id, user_id, youtube_channel_id, is_live, live_video_id')
      .not('youtube_channel_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching barbers:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${barbers?.length || 0} barbers with YouTube channels`);

    if (!barbers || barbers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No barbers with YouTube channels found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Process each barber
    let updatedCount = 0;
    const updates = [];

    for (const barber of barbers) {
      try {
        // Check if barber is currently live on YouTube
        const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${barber.youtube_channel_id}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
        
        const response = await fetch(youtubeUrl);
        const data: YouTubeSearchResponse = await response.json();

        const isLive = data.items && data.items.length > 0;
        const liveVideoId = isLive ? data.items[0].id.videoId : null;

        // Only update if status changed
        if (barber.is_live !== isLive || barber.live_video_id !== liveVideoId) {
          updates.push({
            id: barber.id,
            is_live: isLive,
            live_video_id: liveVideoId,
            last_live_check: new Date().toISOString()
          });

          console.log(`Barber ${barber.id} live status changed: ${barber.is_live} -> ${isLive}`);
        }
      } catch (error) {
        console.error(`Error checking live status for barber ${barber.id}:`, error);
      }
    }

    // Batch update all changed statuses
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('barber_profiles')
          .update({
            is_live: update.is_live,
            live_video_id: update.live_video_id,
            last_live_check: update.last_live_check
          })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating barber ${update.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }

      // Refresh materialized view for stats
      await supabase.rpc('refresh_barber_stats').catch((err) => {
        console.error('Error refreshing barber stats:', err);
      });
    }

    console.log(`Updated ${updatedCount} barbers`);

    return new Response(
      JSON.stringify({ 
        message: 'Live status check completed', 
        checked: barbers.length,
        updated: updatedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in check-youtube-live:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
