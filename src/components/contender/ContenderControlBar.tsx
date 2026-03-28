import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Video, VideoOff, Mic, MicOff, Radio, Square, 
  MessageCircle, Settings, Users, Clock, CheckCircle2, Loader2, SwitchCamera 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StreamStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'live' | 'ended';
type Phase = 'preview' | 'standby' | 'countdown' | 'live';

interface ContenderControlBarProps {
  isMobile: boolean;
  showControls: boolean;
  isMicEnabled: boolean;
  isVideoEnabled: boolean;
  isStreaming: boolean;
  canStart: boolean;
  streamStatus: StreamStatus;
  viewerCount: number;
  formattedDuration: string;
  showChat: boolean;
  hasStream: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onGoLive: () => void;
  onEndStream: () => void;
  onToggleChat: () => void;
  // New phase-based props
  phase?: Phase;
  isReady?: boolean;
  opponentReady?: boolean;
  isOpponentPresent?: boolean;
  onReady?: () => void;
  onSwitchCamera?: () => void;
}

export const ContenderControlBar = memo(function ContenderControlBar({
  isMobile,
  showControls,
  isMicEnabled,
  isVideoEnabled,
  isStreaming,
  canStart,
  streamStatus,
  viewerCount,
  formattedDuration,
  showChat,
  hasStream,
  onToggleMic,
  onToggleVideo,
  onGoLive,
  onEndStream,
  onToggleChat,
  phase = 'live',
  isReady = false,
  opponentReady = false,
  isOpponentPresent = false,
  onReady,
  onSwitchCamera,
}: ContenderControlBarProps) {
  const isPreviewPhase = phase === 'preview' || phase === 'standby';
  const bothReady = isReady && opponentReady;
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent controls-overlay",
      isMobile ? "p-3 pb-safe" : "p-4",
      isMobile && !showControls && "controls-hidden"
    )}>
      <div className="max-w-4xl mx-auto">
        <div className={cn(
          "flex items-center justify-center",
          isMobile ? "gap-3" : "gap-4"
        )}>
          {/* Mic Toggle */}
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => { e.stopPropagation(); onToggleMic(); }}
            disabled={!hasStream}
            className={cn(
              "rounded-full touch-manipulation",
              isMobile ? "w-12 h-12" : "w-14 h-14",
              isMicEnabled 
                ? "bg-white/20 text-white hover:bg-white/30" 
                : "bg-destructive text-white hover:bg-destructive/90"
            )}
          >
            {isMicEnabled 
              ? <Mic className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} /> 
              : <MicOff className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />}
          </Button>

          {/* Video Toggle */}
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => { e.stopPropagation(); onToggleVideo(); }}
            disabled={!hasStream}
            className={cn(
              "rounded-full touch-manipulation",
              isMobile ? "w-12 h-12" : "w-14 h-14",
              isVideoEnabled 
                ? "bg-white/20 text-white hover:bg-white/30" 
                : "bg-destructive text-white hover:bg-destructive/90"
            )}
          >
            {isVideoEnabled 
              ? <Video className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} /> 
              : <VideoOff className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />}
          </Button>

          {/* Camera Flip — preview/standby only */}
          {isPreviewPhase && onSwitchCamera && (
            <Button
              variant="ghost"
              size="lg"
              onClick={(e) => { e.stopPropagation(); onSwitchCamera(); }}
              disabled={!hasStream}
              className={cn(
                "rounded-full bg-white/20 text-white hover:bg-white/30 touch-manipulation",
                isMobile ? "w-12 h-12" : "w-14 h-14"
              )}
            >
              <SwitchCamera className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
            </Button>
          )}

          {/* Phase-based main action button */}
          {isPreviewPhase && !isReady && (
            <Button
              onClick={(e) => { e.stopPropagation(); onReady?.(); }}
              disabled={!hasStream}
              className={cn(
                "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-full shadow-lg shadow-green-500/30 touch-manipulation border border-cyan/20",
                isMobile ? "h-12 px-6 text-sm" : "h-14 px-8 text-lg"
              )}
            >
              <CheckCircle2 className={cn(isMobile ? "w-4 h-4 mr-1.5" : "w-5 h-5 mr-2")} />
              I'M READY
            </Button>
          )}
          
          {isPreviewPhase && isReady && !bothReady && (
            <Button
              disabled
              className={cn(
                "bg-muted text-muted-foreground font-bold rounded-full touch-manipulation",
                isMobile ? "h-12 px-6 text-sm" : "h-14 px-8 text-lg"
              )}
            >
              <Loader2 className={cn(isMobile ? "w-4 h-4 mr-1.5 animate-spin" : "w-5 h-5 mr-2 animate-spin")} />
              {isOpponentPresent ? 'WAITING FOR OPPONENT...' : 'WAITING...'}
            </Button>
          )}
          
          {phase === 'countdown' && (
            <Button
              disabled
              className={cn(
                "bg-gradient-to-r from-primary to-destructive text-white font-bold rounded-full touch-manipulation animate-pulse",
                isMobile ? "h-12 px-6 text-sm" : "h-14 px-8 text-lg"
              )}
            >
              <Radio className={cn(isMobile ? "w-4 h-4 mr-1.5" : "w-5 h-5 mr-2")} />
              STARTING...
            </Button>
          )}

          {/* Live phase buttons */}
          {phase === 'live' && !isStreaming && (
            <Button
              onClick={(e) => { e.stopPropagation(); onGoLive(); }}
              disabled={!canStart}
              className={cn(
                "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold rounded-full shadow-lg shadow-red-500/30 touch-manipulation border border-cyan/20",
                isMobile ? "h-12 px-6 text-sm" : "h-14 px-8 text-lg"
              )}
            >
              <Radio className={cn(isMobile ? "w-4 h-4 mr-1.5" : "w-5 h-5 mr-2")} />
              GO LIVE
            </Button>
          )}
          
          {phase === 'live' && isStreaming && (
            <Button
              onClick={(e) => { e.stopPropagation(); onEndStream(); }}
              variant="destructive"
              className={cn(
                "font-bold rounded-full touch-manipulation",
                isMobile ? "h-12 px-6 text-sm" : "h-14 px-8 text-lg"
              )}
            >
              <Square className={cn(isMobile ? "w-4 h-4 mr-1.5" : "w-5 h-5 mr-2")} />
              END
            </Button>
          )}

          {/* Chat Toggle */}
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => { e.stopPropagation(); onToggleChat(); }}
            className={cn(
              "rounded-full touch-manipulation",
              isMobile ? "w-12 h-12" : "w-14 h-14",
              showChat 
                ? "bg-primary text-primary-foreground" 
                : "bg-white/20 text-white hover:bg-white/30"
            )}
          >
            <MessageCircle className={cn(isMobile ? "w-5 h-5" : "w-6 h-6")} />
          </Button>

          {/* Settings - hide on mobile */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="lg"
              onClick={(e) => e.stopPropagation()}
              className="w-14 h-14 rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <Settings className="w-6 h-6" />
            </Button>
          )}
        </div>

        {/* Status Info - desktop only */}
        {!isMobile && (
          <div className="mt-4 text-center">
            <p className="text-white/60 text-sm">
              {streamStatus === 'idle' && 'Click "GO LIVE" to start broadcasting'}
              {streamStatus === 'connecting' && 'Connecting to stream...'}
              {(streamStatus === 'live' || streamStatus === 'connected') && `Broadcasting to ${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}`}
              {(streamStatus === 'ended' || streamStatus === 'disconnected') && 'Stream ended'}
              {streamStatus === 'failed' && 'Stream failed - try again'}
            </p>
          </div>
        )}

        {/* Mobile live stats */}
        {isMobile && isStreaming && (
          <div className="flex items-center justify-center gap-4 mt-2 text-white/70 text-xs">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{viewerCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formattedDuration}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
