import { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useRemoteParticipants,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import { RoomEvent, ConnectionState, Track } from 'livekit-client';
import { motion } from 'framer-motion';
import { WifiOff, Loader2 } from 'lucide-react';
import { TugOfWarMeter } from './TugOfWarMeter';
import { ServerBattleTimer } from './ServerBattleTimer';

interface LiveKitArenaProps {
  battleId: string;
  serverUrl: string;
  token: string;
  barber1Id: string;
  barber2Id: string;
  barber1Name: string;
  barber2Name: string;
  endsAt: string | null;
  onTimeUp: () => void;
  onDisconnected?: () => void;
}

/** Inner component that has access to LiveKit room context */
const ArenaInner = ({
  barber1Id,
  barber2Id,
  barber1Name,
  barber2Name,
  endsAt,
  onTimeUp,
}: Omit<LiveKitArenaProps, 'battleId' | 'serverUrl' | 'token' | 'onDisconnected'>) => {
  const room = useRoomContext();
  const participants = useRemoteParticipants();
  const connectionState = useConnectionState();

  const [donationTotals, setDonationTotals] = useState({ b1: 0, b2: 0 });

  // Data Channel listener — server-authoritative donation updates
  useEffect(() => {
    const handleData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === 'donation') {
          setDonationTotals({
            b1: msg.total_b1 ?? 0,
            b2: msg.total_b2 ?? 0,
          });
        }
      } catch {
        // ignore non-JSON payloads
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room]);

  const p1 = participants.find((p) => p.identity === barber1Id);
  const p2 = participants.find((p) => p.identity === barber2Id);

  const renderParticipantSide = (
    participant: typeof p1,
    name: string,
    gradient: string
  ) => {
    const videoTrack = participant?.getTrackPublication(Track.Source.Camera)?.track;
    const audioTrack = participant?.getTrackPublication(Track.Source.Microphone)?.track;
    const isConnected = !!participant && participant.connectionQuality !== undefined;

    return (
      <div className="flex-1 relative bg-black overflow-hidden">
        {videoTrack ? (
          <>
            <VideoTrack trackRef={{ participant: participant!, publication: participant!.getTrackPublication(Track.Source.Camera)!, source: Track.Source.Camera }} className="w-full h-full object-cover" />
            {audioTrack && (
              <AudioTrack trackRef={{ participant: participant!, publication: participant!.getTrackPublication(Track.Source.Microphone)!, source: Track.Source.Microphone }} />
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            {connectionState === ConnectionState.Connected ? (
              <>
                <WifiOff className="w-10 h-10 text-white/40" />
                <span className="text-white/60 text-sm">Reconnecting...</span>
                <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                <span className="text-white/40 text-sm">Connecting...</span>
              </>
            )}
          </div>
        )}

        {/* Name overlay */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white bg-gradient-to-r ${gradient} shadow-lg`}>
            {name}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Top bar: timer */}
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-center pt-4">
        <div className="bg-black/70 backdrop-blur-sm rounded-full px-5 py-2">
          {endsAt ? (
            <ServerBattleTimer endsAt={endsAt} onTimeUp={onTimeUp} />
          ) : (
            <span className="text-white/60 text-sm font-mono">LIVE</span>
          )}
        </div>
      </div>

      {/* 50/50 Split */}
      <div className="flex-1 flex">
        {renderParticipantSide(p1, barber1Name, 'from-blue-500 to-blue-600')}
        <div className="w-px bg-white/30" />
        {renderParticipantSide(p2, barber2Name, 'from-purple-500 to-purple-600')}
      </div>

      {/* Tug-of-War meter */}
      <div className="absolute bottom-6 left-4 right-4 z-30">
        <TugOfWarMeter
          barber1Total={donationTotals.b1}
          barber2Total={donationTotals.b2}
          barber1Name={barber1Name}
          barber2Name={barber2Name}
        />
      </div>
    </div>
  );
};

/**
 * LiveKitArena — Full-screen dual-stream WebRTC battle view.
 * Wraps <LiveKitRoom> and renders two publisher streams side-by-side
 * with a Data Channel–powered donation tug-of-war meter.
 */
export const LiveKitArena = ({
  serverUrl,
  token,
  onDisconnected,
  ...innerProps
}: LiveKitArenaProps) => {
  const handleDisconnected = useCallback(() => {
    onDisconnected?.();
  }, [onDisconnected]);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      onDisconnected={handleDisconnected}
      audio={false}
      video={false}
      style={{ height: '100%', width: '100%' }}
    >
      <ArenaInner {...innerProps} />
    </LiveKitRoom>
  );
};
