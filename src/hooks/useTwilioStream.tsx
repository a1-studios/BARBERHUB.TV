import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'failed';

interface StreamState {
  status: StreamStatus;
  roomName: string | null;
  token: string | null;
  localStream: MediaStream | null;
  error: string | null;
  viewerCount: number;
  duration: number;
}

interface UseTwilioStreamOptions {
  battleId: string;
  barberPosition: 1 | 2;
  onStatusChange?: (status: StreamStatus) => void;
}

export const useTwilioStream = ({ battleId, barberPosition, onStatusChange }: UseTwilioStreamOptions) => {
  const [state, setState] = useState<StreamState>({
    status: 'idle',
    roomName: null,
    token: null,
    localStream: null,
    error: null,
    viewerCount: 0,
    duration: 0,
  });

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Update stream status on server
  const updateServerStatus = useCallback(async (status: StreamStatus, viewerCount?: number) => {
    try {
      await supabase.functions.invoke('update-stream-status', {
        body: { battleId, barberPosition, status, viewerCount },
      });
    } catch (error) {
      console.error('Failed to update stream status:', error);
    }
  }, [battleId, barberPosition]);

  // Start streaming
  const startStream = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'connecting', error: null }));
      onStatusChange?.('connecting');

      // Request camera/microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Get Twilio room and token
      const { data, error } = await supabase.functions.invoke('create-twilio-room', {
        body: { battleId, barberPosition },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to create streaming room');
      }

      setState(prev => ({
        ...prev,
        status: 'live',
        roomName: data.roomName,
        token: data.token,
        localStream: stream,
      }));

      // Start duration counter
      startTimeRef.current = new Date();
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const seconds = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
          setState(prev => ({ ...prev, duration: seconds }));
        }
      }, 1000);

      // Update server status
      await updateServerStatus('live');
      onStatusChange?.('live');

      toast.success('🔴 You are now LIVE!');

      return { stream, token: data.token, roomName: data.roomName };

    } catch (error: any) {
      console.error('Failed to start stream:', error);
      
      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Camera/microphone permission denied'
        : error.message || 'Failed to start stream';

      setState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
      }));

      await updateServerStatus('failed');
      onStatusChange?.('failed');
      toast.error(errorMessage);

      throw error;
    }
  }, [battleId, barberPosition, onStatusChange, updateServerStatus]);

  // End streaming
  const endStream = useCallback(async () => {
    try {
      // Stop local media tracks
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop());
      }

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Call end stream API
      await supabase.functions.invoke('end-twilio-stream', {
        body: { battleId, barberPosition },
      });

      setState({
        status: 'ended',
        roomName: null,
        token: null,
        localStream: null,
        error: null,
        viewerCount: 0,
        duration: state.duration,
      });

      onStatusChange?.('ended');
      toast.success('Stream ended');

    } catch (error: any) {
      console.error('Failed to end stream:', error);
      toast.error('Failed to end stream properly');
    }
  }, [battleId, barberPosition, state.localStream, state.duration, onStatusChange]);

  // Update viewer count
  const updateViewerCount = useCallback((count: number) => {
    setState(prev => ({ ...prev, viewerCount: count }));
    updateServerStatus(state.status, count);
  }, [state.status, updateServerStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [state.localStream]);

  // Format duration as MM:SS or HH:MM:SS
  const formattedDuration = useCallback(() => {
    const hours = Math.floor(state.duration / 3600);
    const minutes = Math.floor((state.duration % 3600) / 60);
    const seconds = state.duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [state.duration]);

  return {
    ...state,
    formattedDuration: formattedDuration(),
    startStream,
    endStream,
    updateViewerCount,
    isStreaming: state.status === 'live',
    canStart: state.status === 'idle' || state.status === 'failed' || state.status === 'ended',
  };
};
