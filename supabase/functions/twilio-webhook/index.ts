import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twilio webhook event types we handle
type TwilioEventType = 
  | "room-created" 
  | "room-ended" 
  | "participant-connected" 
  | "participant-disconnected"
  | "recording-started"
  | "recording-completed"
  | "recording-failed";

interface TwilioWebhookPayload {
  AccountSid: string;
  RoomName: string;
  RoomSid: string;
  RoomStatus?: string;
  RoomType?: string;
  StatusCallbackEvent: TwilioEventType;
  Timestamp: string;
  // Participant events
  ParticipantSid?: string;
  ParticipantIdentity?: string;
  ParticipantStatus?: string;
  ParticipantDuration?: string;
  // Recording events
  RecordingSid?: string;
  RecordingUri?: string;
  RecordingDuration?: string;
  RecordingSize?: string;
  RecordingStatus?: string;
  Container?: string;
  Codec?: string;
  TrackName?: string;
  SourceSid?: string;
  MediaExternalLocation?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse form-urlencoded body (Twilio sends webhooks as form data)
    const formData = await req.formData();
    const payload: Partial<TwilioWebhookPayload> = {};
    
    for (const [key, value] of formData.entries()) {
      (payload as any)[key] = value;
    }

    const eventType = payload.StatusCallbackEvent as TwilioEventType;
    const roomName = payload.RoomName;
    const roomSid = payload.RoomSid;

    console.log(`Twilio webhook received: ${eventType} for room ${roomName}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    if (!roomName || !eventType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract battle ID from room name (format: battle-{uuid})
    const battleIdMatch = roomName.match(/^battle-(.+)$/);
    const battleId = battleIdMatch ? battleIdMatch[1] : null;

    switch (eventType) {
      case "room-created": {
        console.log(`Room created: ${roomName} (${roomSid})`);
        
        // Update stream_sessions with room_sid
        if (battleId) {
          await supabase
            .from("stream_sessions")
            .update({ 
              room_sid: roomSid,
              room_name: roomName,
              status: "active",
              updated_at: new Date().toISOString()
            })
            .eq("battle_id", battleId)
            .is("room_sid", null);
        }
        break;
      }

      case "participant-connected": {
        const participantIdentity = payload.ParticipantIdentity;
        console.log(`Participant connected: ${participantIdentity} to room ${roomName}`);
        
        // Update stream session for this barber
        if (battleId && participantIdentity) {
          await supabase
            .from("stream_sessions")
            .update({ 
              participant_sid: payload.ParticipantSid,
              status: "streaming",
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("battle_id", battleId)
            .eq("barber_id", participantIdentity);

          // Update battle to show barber is live
          // Determine which barber position this is
          const { data: battle } = await supabase
            .from("battles")
            .select("barber1_id, barber2_id")
            .eq("id", battleId)
            .single();

          if (battle) {
            const updateField = battle.barber1_id === participantIdentity 
              ? "barber1_streaming" 
              : "barber2_streaming";
            
            await supabase
              .from("battles")
              .update({ 
                [updateField]: true,
                status: "live"
              })
              .eq("id", battleId);
          }
        }
        break;
      }

      case "participant-disconnected": {
        const participantIdentity = payload.ParticipantIdentity;
        const duration = parseInt(payload.ParticipantDuration || "0", 10);
        console.log(`Participant disconnected: ${participantIdentity} after ${duration}s`);
        
        if (battleId && participantIdentity) {
          // Update stream session
          await supabase
            .from("stream_sessions")
            .update({ 
              status: "ended",
              ended_at: new Date().toISOString(),
              duration_seconds: duration,
              updated_at: new Date().toISOString()
            })
            .eq("battle_id", battleId)
            .eq("barber_id", participantIdentity);

          // Update battle to show barber stopped streaming
          const { data: battle } = await supabase
            .from("battles")
            .select("barber1_id, barber2_id")
            .eq("id", battleId)
            .single();

          if (battle) {
            const updateField = battle.barber1_id === participantIdentity 
              ? "barber1_streaming" 
              : "barber2_streaming";
            
            await supabase
              .from("battles")
              .update({ [updateField]: false })
              .eq("id", battleId);
          }

          // Update barber_profiles with streaming stats
          await supabase.rpc("increment_barber_stream_stats", {
            p_barber_id: participantIdentity,
            p_duration_minutes: Math.ceil(duration / 60)
          });
        }
        break;
      }

      case "room-ended": {
        console.log(`Room ended: ${roomName}`);
        
        if (battleId) {
          // Mark all stream sessions for this battle as ended
          await supabase
            .from("stream_sessions")
            .update({ 
              status: "ended",
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("battle_id", battleId)
            .neq("status", "ended");

          // Check if both barbers have recordings ready before transitioning to voting
          const { data: sessions } = await supabase
            .from("stream_sessions")
            .select("recording_status")
            .eq("battle_id", battleId);

          const allRecordingsComplete = sessions?.every(s => s.recording_status === "completed");
          
          if (allRecordingsComplete) {
            // Transition battle to voting phase
            await supabase
              .from("battles")
              .update({ 
                status: "voting",
                barber1_streaming: false,
                barber2_streaming: false,
                voting_started_at: new Date().toISOString()
              })
              .eq("id", battleId);
            
            console.log(`Battle ${battleId} transitioned to voting phase`);
          }
        }
        break;
      }

      case "recording-started": {
        console.log(`Recording started for room ${roomName}`);
        
        // Find the stream session by participant
        const participantIdentity = payload.ParticipantIdentity || payload.SourceSid;
        
        if (battleId) {
          await supabase
            .from("stream_sessions")
            .update({ 
              recording_sid: payload.RecordingSid,
              recording_status: "recording",
              updated_at: new Date().toISOString()
            })
            .eq("battle_id", battleId)
            .eq("room_sid", roomSid);
        }
        break;
      }

      case "recording-completed": {
        const recordingSid = payload.RecordingSid;
        const recordingUri = payload.RecordingUri;
        const recordingDuration = parseInt(payload.RecordingDuration || "0", 10);
        const mediaLocation = payload.MediaExternalLocation;
        
        console.log(`Recording completed: ${recordingSid}`);
        console.log(`Recording URI: ${recordingUri}`);
        console.log(`Media location: ${mediaLocation}`);

        // Construct the full recording URL
        // Twilio recording URLs follow this pattern:
        // https://video.twilio.com/v1/Recordings/{RecordingSid}/Media
        const recordingUrl = mediaLocation || 
          (recordingUri ? `https://video.twilio.com${recordingUri}` : null);

        if (battleId && recordingSid) {
          // Update stream session with recording URL
          const { error: updateError } = await supabase
            .from("stream_sessions")
            .update({ 
              recording_sid: recordingSid,
              recording_url: recordingUrl,
              recording_status: "completed",
              duration_seconds: recordingDuration,
              updated_at: new Date().toISOString()
            })
            .eq("battle_id", battleId)
            .eq("recording_sid", recordingSid);

          if (updateError) {
            // Try updating by room_sid instead
            await supabase
              .from("stream_sessions")
              .update({ 
                recording_sid: recordingSid,
                recording_url: recordingUrl,
                recording_status: "completed",
                duration_seconds: recordingDuration,
                updated_at: new Date().toISOString()
              })
              .eq("battle_id", battleId)
              .eq("room_sid", roomSid);
          }

          console.log(`Stored recording URL for battle ${battleId}: ${recordingUrl}`);

          // Check if all recordings are complete - if so, transition to voting
          const { data: sessions } = await supabase
            .from("stream_sessions")
            .select("recording_status, barber_id")
            .eq("battle_id", battleId);

          const allComplete = sessions && sessions.length >= 2 && 
            sessions.every(s => s.recording_status === "completed");

          if (allComplete) {
            // Both barbers have recordings - transition to voting
            const { data: battle } = await supabase
              .from("battles")
              .select("status")
              .eq("id", battleId)
              .single();

            if (battle && battle.status !== "voting" && battle.status !== "completed") {
              await supabase
                .from("battles")
                .update({ 
                  status: "voting",
                  voting_started_at: new Date().toISOString()
                })
                .eq("id", battleId);

              console.log(`Battle ${battleId} transitioned to voting - all recordings complete`);
            }
          }
        }
        break;
      }

      case "recording-failed": {
        console.error(`Recording failed for room ${roomName}: ${JSON.stringify(payload)}`);
        
        if (battleId) {
          await supabase
            .from("stream_sessions")
            .update({ 
              recording_status: "failed",
              error_message: "Recording failed",
              updated_at: new Date().toISOString()
            })
            .eq("battle_id", battleId)
            .eq("room_sid", roomSid);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event: eventType,
        room: roomName,
        battle_id: battleId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
