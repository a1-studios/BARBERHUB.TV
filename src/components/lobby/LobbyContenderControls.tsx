import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, SwitchCamera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LobbyContenderControlsProps {
  hasStream: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onSwitchCamera: () => void;
}

/**
 * Compact, lobby-only contender control rail. Anchored just above the
 * FanTerminal so contenders can mute, blank video, or flip the camera while
 * waiting for the opponent to lock in.
 */
export const LobbyContenderControls = ({
  hasStream,
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onSwitchCamera,
}: LobbyContenderControlsProps) => {
  return (
    <div
      className="lobby-ui-interactive pointer-events-auto absolute left-1/2 z-30 -translate-x-1/2"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.25rem)' }}
    >
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 p-1.5 backdrop-blur-xl ring-1 ring-cyan-400/20 shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAudio}
          disabled={!hasStream}
          aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={cn(
            'h-10 w-10 rounded-full transition-colors',
            isAudioEnabled
              ? 'bg-white/10 text-white hover:bg-white/20'
              : 'bg-red-500/80 text-white hover:bg-red-500'
          )}
        >
          {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleVideo}
          disabled={!hasStream}
          aria-label={isVideoEnabled ? 'Disable camera' : 'Enable camera'}
          className={cn(
            'h-10 w-10 rounded-full transition-colors',
            isVideoEnabled
              ? 'bg-white/10 text-white hover:bg-white/20'
              : 'bg-red-500/80 text-white hover:bg-red-500'
          )}
        >
          {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSwitchCamera}
          disabled={!hasStream}
          aria-label="Flip camera"
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <SwitchCamera className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
