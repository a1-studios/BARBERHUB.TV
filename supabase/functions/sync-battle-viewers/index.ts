import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeVideo {
  id: string;
  liveStreamingDetails?: {
    concurrentViewers?: string;
    activeLiveChatId?: string;
  };
}

interface YouTubeResponse {
  items: YouTubeVideo[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting YouTube live viewer sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

    if (!youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active battles (status = 'voting')
    const { data: battles, error: fetchError } = await supabase
      .from('battles')
      .select('id, barber1_youtube_video_id, barber2_youtube_video_id, barber1_peak_viewers, barber2_peak_viewers')
      .eq('status', 'voting')
      .not('barber1_youtube_video_id', 'is', null)
      .not('barber2_youtube_video_id', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!battles || battles.length === 0) {
      console.log('No active battles with YouTube streams found');
      return new Response(
        JSON.stringify({ message: 'No active battles', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${battles.length} active battle(s) to sync`);

    const updates = [];

    // Process each battle
    for (const battle of battles) {
      try {
        // Collect video IDs for batch request
        const videoIds = [
          battle.barber1_youtube_video_id,
          battle.barber2_youtube_video_id
        ].filter(Boolean).join(',');

        // Fetch viewer counts from YouTube API
        const youtubeUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoIds}&key=${youtubeApiKey}`;
        
        const response = await fetch(youtubeUrl);
        
        if (!response.ok) {
          console.error(`YouTube API error for battle ${battle.id}:`, response.status);
          continue;
        }

        const data: YouTubeResponse = await response.json();

        // Extract viewer counts
        let barber1Viewers = 0;
        let barber2Viewers = 0;

        for (const video of data.items) {
          const viewers = parseInt(video.liveStreamingDetails?.concurrentViewers || '0');
          
          if (video.id === battle.barber1_youtube_video_id) {
            barber1Viewers = viewers;
          } else if (video.id === battle.barber2_youtube_video_id) {
            barber2Viewers = viewers;
          }
        }

        // Calculate peak viewers
        const newPeak1 = Math.max(barber1Viewers, battle.barber1_peak_viewers || 0);
        const newPeak2 = Math.max(barber2Viewers, battle.barber2_peak_viewers || 0);

        // Update battle with new viewer counts
        const { error: updateError } = await supabase
          .from('battles')
          .update({
            barber1_live_viewers: barber1Viewers,
            barber2_live_viewers: barber2Viewers,
            barber1_peak_viewers: newPeak1,
            barber2_peak_viewers: newPeak2,
            last_viewer_check: new Date().toISOString()
          })
          .eq('id', battle.id);

        if (updateError) {
          console.error(`Error updating battle ${battle.id}:`, updateError);
        } else {
          console.log(`Updated battle ${battle.id}:`, {
            barber1: barber1Viewers,
            barber2: barber2Viewers,
            peak1: newPeak1,
            peak2: newPeak2
          });
          updates.push({
            battleId: battle.id,
            barber1Viewers,
            barber2Viewers
          });
        }

      } catch (error) {
        console.error(`Error processing battle ${battle.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Viewer counts synced successfully',
        updated: updates.length,
        battles: updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-battle-viewers:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
