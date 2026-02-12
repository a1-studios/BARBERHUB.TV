import { useState, useCallback, useRef, useEffect } from 'react';
import Video, { 
  Room, 
  LocalVideoTrack, 
  LocalAudioTrack,
  RemoteParticipant, 
  RemoteTrack,
  RemoteVideoTrack,
  RemoteAudioTrack,
  LocalTrackPublication,
  RemoteTrackPublication
} from 'twilio-video';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BattleRoomStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

interface UseBattleVideoRoomOptions {
  battleId: string;
  onOpponentJoin?: (participant: RemoteParticipant) => void;
  onOpponentLeave?: () => void;
  onDisconnect?: (error?: Error) => void;
}

interface BattleVideoState {
  status: BattleRoomStatus;
  room: Room | null;
  localVideoTrack: LocalVideoTrack | null;
  localAudioTrack: LocalAudioTrack | null;
  remoteVideoTrack: RemoteVideoTrack | null;
  remoteAudioTrack: RemoteAudioTrack | null;
  opponentIdentity: string | null;
  error: string | null;
  duration: number;
}

export const useBattleVideoRoom = ({ 
  battleId, 
  onOpponentJoin, 
  onOpponentLeave,
  onDisconnect 
}: UseBattleVideoRoomOptions) => {
  const [state, setState] = useState<BattleVideoState>({
    status: 'idle',
    room: null,
    localVideoTrack: null,
    localAudioTrack: null,
    remoteVideoTrack: null,
    remoteAudioTrack: null,
    opponentIdentity: null,
    error: null,
    duration: 0,
  });

  const roomRef = useRef<Room | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const connectingRef = useRef(false);

  // Handle remote participant's track subscriptions
  const handleTrackSubscribed = useCallback((track: RemoteTrack) => {
    if (track.kind === 'video') {
      setState(prev => ({ ...prev, remoteVideoTrack: track as RemoteVideoTrack }));
    } else if (track.kind === 'audio') {
      setState(prev => ({ ...prev, remoteAudioTrack: track as RemoteAudioTrack }));
    }
  }, []);

  const handleTrackUnsubscribed = useCallback((track: RemoteTrack) => {
    if (track.kind === 'video') {
      setState(prev => ({ ...prev, remoteVideoTrack: null }));
    } else if (track.kind === 'audio') {
      setState(prev => ({ ...prev, remoteAudioTrack: null }));
    }
  }, []);

  const handleParticipantConnected = useCallback((participant: RemoteParticipant) => {
    console.log(`Opponent connected: ${participant.identity}`);
    setState(prev => ({ ...prev, opponentIdentity: participant.identity }));
    
    participant.tracks.forEach((publication: RemoteTrackPublication) => {
      if (publication.isSubscribed && publication.track) {
        handleTrackSubscribed(publication.track);
      }
    });

    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);

    onOpponentJoin?.(participant);
    toast.success('🥊 Opponent has entered the battle!');
  }, [handleTrackSubscribed, handleTrackUnsubscribed, onOpponentJoin]);

  const handleParticipantDisconnected = useCallback((participant: RemoteParticipant) => {
    console.log(`Opponent disconnected: ${participant.identity}`);
    setState(prev => ({
      ...prev,
      opponentIdentity: null,
      remoteVideoTrack: null,
      remoteAudioTrack: null,
    }));
    onOpponentLeave?.();
    toast.info('Opponent has left the battle');
  }, [onOpponentLeave]);

  // Helper to get a fresh access token
  const getFreshToken = useCallback(async (): Promise<string> => {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.access_token) {
      return refreshData.session.access_token;
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      throw new Error('Please sign in again to join the battle');
    }
    return sessionData.session.access_token;
  }, []);

  // Connect to Twilio room with retry logic for room-not-found
  const connectToRoom = useCallback(async (
    twilioToken: string,
    roomName: string,
    retriesLeft: number = 1
  ): Promise<Room> => {
    try {
      const room = await Video.connect(twilioToken, {
        name: roomName,
        video: { 
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        dominantSpeaker: true,
        networkQuality: { local: 1, remote: 1 },
        preferredVideoCodecs: [{ codec: 'VP8', simulcast: false }],
      });
      return room;
    } catch (error: any) {
      // Retry once on room-not-found (code 53113) with a delay
      if (retriesLeft > 0 && (error.code === 53113 || error.code === 53118 || error.message?.includes('Room not found'))) {
        console.log(`Room not found, retrying in 2s... (${retriesLeft} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return connectToRoom(twilioToken, roomName, retriesLeft - 1);
      }
      throw error;
    }
  }, []);

  const connect = useCallback(async () => {
    if (connectingRef.current) {
      console.log('Connect already in progress, skipping duplicate call');
      return;
    }
    connectingRef.current = true;

    try {
      setState(prev => ({ ...prev, status: 'connecting', error: null }));

      const accessToken = await getFreshToken();
      console.log('Calling generate-battle-token with fresh auth token');

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('generate-battle-token', {
        body: { battleId },
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (tokenError || !tokenData?.token) {
        throw new Error(tokenError?.message || tokenData?.error || 'Failed to get battle token');
      }

      console.log(`Connecting to room: ${tokenData.roomName}`);

      // Connect with retry logic
      const room = await connectToRoom(tokenData.token, tokenData.roomName);

      roomRef.current = room;

      const localVideoTrack = Array.from(room.localParticipant.videoTracks.values())[0]?.track as LocalVideoTrack || null;
      const localAudioTrack = Array.from(room.localParticipant.audioTracks.values())[0]?.track as LocalAudioTrack || null;

      // Check for existing participants
      room.participants.forEach(handleParticipantConnected);

      room.on('participantConnected', handleParticipantConnected);
      room.on('participantDisconnected', handleParticipantDisconnected);

      room.on('disconnected', (room, error) => {
        console.log('Disconnected from room', error?.message);
        
        room.localParticipant.tracks.forEach((publication: LocalTrackPublication) => {
          if (publication.track.kind === 'video' || publication.track.kind === 'audio') {
            publication.track.stop();
          }
        });

        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }

        setState(prev => ({
          ...prev,
          status: 'disconnected',
          room: null,
          localVideoTrack: null,
          localAudioTrack: null,
          remoteVideoTrack: null,
          remoteAudioTrack: null,
        }));

        onDisconnect?.(error);
        
        if (error) {
          toast.error(`Connection lost: ${error.message}`);
        }
      });

      // Start duration counter
      startTimeRef.current = new Date();
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const seconds = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
          setState(prev => ({ ...prev, duration: seconds }));
        }
      }, 1000);

      setState(prev => ({
        ...prev,
        status: 'connected',
        room,
        localVideoTrack,
        localAudioTrack,
      }));

      // Client-side fallback: update streaming flag via update-stream-status
      try {
        await supabase.functions.invoke('update-stream-status', {
          body: { battleId, isStreaming: true },
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (flagErr) {
        console.warn('Streaming flag fallback failed (non-critical):', flagErr);
      }

      toast.success('🔴 You are LIVE in the battle!');

      return { room, token: tokenData.token, roomName: tokenData.roomName };

    } catch (error: any) {
      console.error('Failed to connect to battle room:', error);
      
      const errorMessage = error.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied'
        : error.message || 'Failed to connect to battle room';

      setState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    } finally {
      connectingRef.current = false;
    }
  }, [battleId, getFreshToken, connectToRoom, handleParticipantConnected, handleParticipantDisconnected, onDisconnect]);

  // Disconnect from the room
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      status: 'disconnected',
      room: null,
      localVideoTrack: null,
      localAudioTrack: null,
      remoteVideoTrack: null,
      remoteAudioTrack: null,
      opponentIdentity: null,
    }));

    toast.success('Stream ended');
  }, []);

  const toggleVideo = useCallback(() => {
    if (state.localVideoTrack) {
      if (state.localVideoTrack.isEnabled) {
        state.localVideoTrack.disable();
      } else {
        state.localVideoTrack.enable();
      }
      setState(prev => ({ ...prev }));
    }
  }, [state.localVideoTrack]);

  const toggleAudio = useCallback(() => {
    if (state.localAudioTrack) {
      if (state.localAudioTrack.isEnabled) {
        state.localAudioTrack.disable();
      } else {
        state.localAudioTrack.enable();
      }
      setState(prev => ({ ...prev }));
    }
  }, [state.localAudioTrack]);

  const formattedDuration = useCallback(() => {
    const hours = Math.floor(state.duration / 3600);
    const minutes = Math.floor((state.duration % 3600) / 60);
    const seconds = state.duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [state.duration]);

  // Cleanup on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      roomRef.current?.disconnect();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    isVideoEnabled: state.localVideoTrack?.isEnabled ?? false,
    isAudioEnabled: state.localAudioTrack?.isEnabled ?? false,
    formattedDuration: formattedDuration(),
    connect,
    disconnect,
    toggleVideo,
    toggleAudio,
    isConnected: state.status === 'connected',
    isConnecting: state.status === 'connecting',
    hasOpponent: !!state.opponentIdentity,
  };
};
