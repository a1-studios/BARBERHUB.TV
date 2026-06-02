import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  LocalTrack,
} from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BattleRoomStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

interface UseBattleVideoRoomOptions {
  battleId: string;
  /**
   * Opponent's LiveKit identity (the other barber's barber_profile.id).
   * When provided, viewer joins/leaves are ignored — only the opponent's
   * presence drives `opponentIdentity`, `remoteVideoTrack`, and toasts.
   */
  opponentIdentity?: string | null;
  /** Position 1 or 2 — required for accurate stream-status updates. */
  barberPosition?: 1 | 2 | null;
  onOpponentJoin?: (participant: RemoteParticipant) => void;
  onOpponentLeave?: () => void;
  onDisconnect?: (error?: Error) => void;
}

const MAX_RECONNECT_ATTEMPTS = 6;
const RECONNECT_BASE_DELAY_MS = 1500;

/** A track-like object that has attach/detach (works for both LiveKit local & remote tracks). */
export type AttachableTrack = {
  attach(): HTMLMediaElement;
  detach(): HTMLMediaElement[];
  kind: Track.Kind;
  isMuted?: boolean;
};

interface BattleVideoState {
  status: BattleRoomStatus;
  room: Room | null;
  localVideoTrack: AttachableTrack | null;
  localAudioTrack: AttachableTrack | null;
  remoteVideoTrack: AttachableTrack | null;
  remoteAudioTrack: AttachableTrack | null;
  opponentIdentity: string | null;
  error: string | null;
  duration: number;
}

export const useBattleVideoRoom = ({
  battleId,
  opponentIdentity: expectedOpponentIdentity,
  onOpponentJoin,
  onOpponentLeave,
  onDisconnect,
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
  const expectedOpponentRef = useRef<string | null | undefined>(expectedOpponentIdentity);

  useEffect(() => {
    expectedOpponentRef.current = expectedOpponentIdentity;
  }, [expectedOpponentIdentity]);

  /** Match only the opponent barber when an expected identity is provided. */
  const isOpponent = useCallback((identity: string) => {
    const expected = expectedOpponentRef.current;
    if (!expected) return true; // legacy: treat any remote as opponent
    return identity === expected;
  }, []);

  const handleTrackSubscribed = useCallback(
    (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      // Ignore viewer/spectator tracks — only the opponent barber drives the remote feed.
      if (!isOpponent(participant.identity)) return;
      if (track.kind === Track.Kind.Video) {
        setState((prev) => ({ ...prev, remoteVideoTrack: track as unknown as AttachableTrack }));
      } else if (track.kind === Track.Kind.Audio) {
        setState((prev) => ({ ...prev, remoteAudioTrack: track as unknown as AttachableTrack }));
      }
    },
    [isOpponent]
  );

  const handleTrackUnsubscribed = useCallback(
    (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (!isOpponent(participant.identity)) return;
      if (track.kind === Track.Kind.Video) {
        setState((prev) => ({ ...prev, remoteVideoTrack: null }));
      } else if (track.kind === Track.Kind.Audio) {
        setState((prev) => ({ ...prev, remoteAudioTrack: null }));
      }
    },
    [isOpponent]
  );

  const handleParticipantConnected = useCallback(
    (participant: RemoteParticipant) => {
      if (!isOpponent(participant.identity)) {
        console.log(`Viewer joined: ${participant.identity} (ignored for opponent state)`);
        return;
      }
      console.log(`Opponent connected: ${participant.identity}`);
      setState((prev) => ({ ...prev, opponentIdentity: participant.identity }));
      onOpponentJoin?.(participant);
      toast.success('🥊 Opponent has entered the battle!');
    },
    [onOpponentJoin, isOpponent]
  );

  const handleParticipantDisconnected = useCallback(
    (participant: RemoteParticipant) => {
      if (!isOpponent(participant.identity)) {
        console.log(`Viewer left: ${participant.identity} (opponent feed unaffected)`);
        return;
      }
      console.log(`Opponent disconnected: ${participant.identity}`);
      setState((prev) => ({
        ...prev,
        opponentIdentity: null,
        remoteVideoTrack: null,
        remoteAudioTrack: null,
      }));
      onOpponentLeave?.();
      toast.info('Opponent connection lost — waiting for them to rejoin…');
    },
    [onOpponentLeave]
  );

  const getFreshToken = useCallback(async (): Promise<string> => {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.access_token) return refreshData.session.access_token;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      throw new Error('Please sign in again to join the battle');
    }
    return sessionData.session.access_token;
  }, []);

  const connect = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;

    try {
      setState((prev) => ({ ...prev, status: 'connecting', error: null }));

      const accessToken = await getFreshToken();

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        'generate-livekit-token',
        {
          body: { battleId },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (tokenError || !tokenData?.token) {
        throw new Error(tokenError?.message || tokenData?.error || 'Failed to get battle token');
      }

      console.log(`Connecting to LiveKit room: ${tokenData.roomName}`);

      const { createBattleRoom } = await import('@/lib/livekit');
      const room = createBattleRoom();

      // Wire up events before connecting
      room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

      room.on(RoomEvent.Disconnected, (reason) => {
        console.log('Disconnected from room', reason);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        setState((prev) => ({
          ...prev,
          status: 'disconnected',
          room: null,
          localVideoTrack: null,
          localAudioTrack: null,
          remoteVideoTrack: null,
          remoteAudioTrack: null,
        }));
        onDisconnect?.();
      });

      await room.connect(tokenData.serverUrl, tokenData.token);

      // Enable camera + mic
      await room.localParticipant.enableCameraAndMicrophone();

      roomRef.current = room;

      // Grab local tracks
      let localVideo: AttachableTrack | null = null;
      let localAudio: AttachableTrack | null = null;
      room.localParticipant.trackPublications.forEach((pub) => {
        if (pub.track) {
          if (pub.track.kind === Track.Kind.Video) localVideo = pub.track as unknown as AttachableTrack;
          if (pub.track.kind === Track.Kind.Audio) localAudio = pub.track as unknown as AttachableTrack;
        }
      });

      // Check existing remote participants
      room.remoteParticipants.forEach((p) => {
        handleParticipantConnected(p);
        p.trackPublications.forEach((pub) => {
          if (pub.track && pub.isSubscribed) {
            handleTrackSubscribed(pub.track as RemoteTrack, pub, p);
          }
        });
      });

      startTimeRef.current = new Date();
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setState((prev) => ({
            ...prev,
            duration: Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000),
          }));
        }
      }, 1000);

      setState((prev) => ({
        ...prev,
        status: 'connected',
        room,
        localVideoTrack: localVideo,
        localAudioTrack: localAudio,
      }));

      // Update streaming flag
      try {
        await supabase.functions.invoke('update-stream-status', {
          body: { battleId, isStreaming: true },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (e) {
        console.warn('Streaming flag fallback failed:', e);
      }

      toast.success('🔴 You are LIVE in the battle!');
      return { room, token: tokenData.token, roomName: tokenData.roomName };
    } catch (error: any) {
      console.error('Failed to connect:', error);
      const msg =
        error.name === 'NotAllowedError'
          ? 'Camera/microphone permission denied'
          : error.message || 'Failed to connect';
      setState((prev) => ({ ...prev, status: 'failed', error: msg }));
      toast.error(msg);
      throw error;
    } finally {
      connectingRef.current = false;
    }
  }, [
    battleId,
    getFreshToken,
    handleTrackSubscribed,
    handleTrackUnsubscribed,
    handleParticipantConnected,
    handleParticipantDisconnected,
    onDisconnect,
  ]);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setState((prev) => ({
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
    const room = roomRef.current;
    if (!room) return;
    const pub = Array.from(room.localParticipant.trackPublications.values()).find(
      (p) => p.track?.kind === Track.Kind.Video
    );
    if (pub?.track) {
      if (pub.isMuted) {
        pub.track.unmute();
      } else {
        pub.track.mute();
      }
      setState((prev) => ({ ...prev }));
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const pub = Array.from(room.localParticipant.trackPublications.values()).find(
      (p) => p.track?.kind === Track.Kind.Audio
    );
    if (pub?.track) {
      if (pub.isMuted) {
        pub.track.unmute();
      } else {
        pub.track.mute();
      }
      setState((prev) => ({ ...prev }));
    }
  }, []);

  const formattedDuration = useCallback(() => {
    const h = Math.floor(state.duration / 3600);
    const m = Math.floor((state.duration % 3600) / 60);
    const s = state.duration % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [state.duration]);

  useEffect(() => {
    const onBeforeUnload = () => roomRef.current?.disconnect();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      roomRef.current?.disconnect();
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  const room = roomRef.current;
  const videoPub = room
    ? Array.from(room.localParticipant.trackPublications.values()).find(
        (p) => p.track?.kind === Track.Kind.Video
      )
    : null;
  const audioPub = room
    ? Array.from(room.localParticipant.trackPublications.values()).find(
        (p) => p.track?.kind === Track.Kind.Audio
      )
    : null;

  return {
    ...state,
    isVideoEnabled: videoPub ? !videoPub.isMuted : false,
    isAudioEnabled: audioPub ? !audioPub.isMuted : false,
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
