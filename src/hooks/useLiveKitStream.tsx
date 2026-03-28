import { useState, useCallback, useRef, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
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

interface UseLiveKitStreamOptions {
  battleId: string;
  barberPosition: 1 | 2;
  onStatusChange?: (status: StreamStatus) => void;
}

export const useLiveKitStream = ({
  battleId,
  barberPosition,
  onStatusChange,
}: UseLiveKitStreamOptions) => {
  const [state, setState] = useState<StreamState>({
    status: 'idle',
    roomName: null,
    token: null,
    localStream: null,
    error: null,
    viewerCount: 0,
    duration: 0,
  });

  const roomRef = useRef<Room | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const updateServerStatus = useCallback(
    async (status: StreamStatus, viewerCount?: number) => {
      try {
        await supabase.functions.invoke('update-stream-status', {
          body: { battleId, barberPosition, status, viewerCount },
        });
      } catch (e) {
        console.error('Failed to update stream status:', e);
      }
    },
    [battleId, barberPosition]
  );

  const startStream = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: 'connecting', error: null }));
      onStatusChange?.('connecting');

      // Get LiveKit token
      const { data, error } = await supabase.functions.invoke('generate-livekit-token', {
        body: { battleId },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to create streaming room');
      }

      const { createBattleRoom } = await import('@/lib/livekit');
      const room = createBattleRoom();
      await room.connect(data.serverUrl, data.token);

      // Enable camera + mic
      await room.localParticipant.enableCameraAndMicrophone();

      roomRef.current = room;

      // Extract MediaStream from local video track for preview
      let localStream: MediaStream | null = null;
      room.localParticipant.trackPublications.forEach((pub) => {
        if (pub.track?.kind === Track.Kind.Video && pub.track.mediaStream) {
          localStream = pub.track.mediaStream;
        }
      });

      setState((prev) => ({
        ...prev,
        status: 'live',
        roomName: data.roomName,
        token: data.token,
        localStream,
      }));

      startTimeRef.current = new Date();
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setState((prev) => ({
            ...prev,
            duration: Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000),
          }));
        }
      }, 1000);

      await updateServerStatus('live');
      onStatusChange?.('live');
      toast.success('🔴 You are now LIVE!');

      return { stream: localStream, token: data.token, roomName: data.roomName };
    } catch (error: any) {
      console.error('Failed to start stream:', error);
      const msg =
        error.name === 'NotAllowedError'
          ? 'Camera/microphone permission denied'
          : error.message || 'Failed to start stream';

      setState((prev) => ({ ...prev, status: 'failed', error: msg }));
      await updateServerStatus('failed');
      onStatusChange?.('failed');
      toast.error(msg);
      throw error;
    }
  }, [battleId, barberPosition, onStatusChange, updateServerStatus]);

  const endStream = useCallback(async () => {
    try {
      roomRef.current?.disconnect();
      roomRef.current = null;

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Notify server that stream ended
      await supabase.functions.invoke('update-stream-status', {
        body: { battleId, barberPosition, status: 'ended' },
      });

      setState((prev) => ({
        status: 'ended',
        roomName: null,
        token: null,
        localStream: null,
        error: null,
        viewerCount: 0,
        duration: prev.duration,
      }));

      onStatusChange?.('ended');
      toast.success('Stream ended');
    } catch (error: any) {
      console.error('Failed to end stream:', error);
      toast.error('Failed to end stream properly');
    }
  }, [battleId, barberPosition, onStatusChange]);

  const updateViewerCount = useCallback(
    (count: number) => {
      setState((prev) => ({ ...prev, viewerCount: count }));
      updateServerStatus(state.status, count);
    },
    [state.status, updateServerStatus]
  );

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  const formattedDuration = useCallback(() => {
    const h = Math.floor(state.duration / 3600);
    const m = Math.floor((state.duration % 3600) / 60);
    const s = state.duration % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
