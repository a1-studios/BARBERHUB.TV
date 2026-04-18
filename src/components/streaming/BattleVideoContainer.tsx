import { useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Users, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { ReadinessBadge } from '@/components/contender/ReadinessBadge';
import type { AttachableTrack } from '@/hooks/useBattleVideoRoom';

interface VideoAttachProps {
  track: AttachableTrack | null;
  className?: string;
  muted?: boolean;
}

// Component to attach a video track to a DOM element
const VideoAttach = memo(({ track, className, muted = false }: VideoAttachProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !track) return;

    const element = track.attach();
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.objectFit = 'cover';
    if (muted) {
      element.muted = true;
    }
    
    containerRef.current.appendChild(element);

    return () => {
      track.detach().forEach(el => el.remove());
    };
  }, [track, muted]);

  return <div ref={containerRef} className={className} />;
});

VideoAttach.displayName = 'VideoAttach';

// Stream preview from MediaStream (for preview phase before connection)
interface StreamPreviewProps {
  stream: MediaStream | null;
  className?: string;
  muted?: boolean;
}

const StreamPreview = memo(({ stream, className, muted = true }: StreamPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn("w-full h-full object-cover", className)}
    />
  );
});

StreamPreview.displayName = 'StreamPreview';

interface BattleVideoContainerProps {
  localTrack: AttachableTrack | null;
  remoteTrack: AttachableTrack | null;
  localBarberName: string;
  remoteBarberName: string;
  localCountry?: string;
  remoteCountry?: string;
  isConnecting?: boolean;
  isConnected?: boolean;
  hasOpponent?: boolean;
  duration?: string;
  viewerCount?: number;
  className?: string;
  layout?: 'split' | 'pip' | 'preview' | 'standby';
  // Standby mode props
  previewStream?: MediaStream | null;
  localReady?: boolean;
  opponentReady?: boolean;
  isOpponentPresent?: boolean;
}

export const BattleVideoContainer = ({
  localTrack,
  remoteTrack,
  localBarberName,
  remoteBarberName,
  localCountry,
  remoteCountry,
  isConnecting = false,
  isConnected = false,
  hasOpponent = false,
  duration = '0:00',
  viewerCount = 0,
  className,
  layout = 'split',
  previewStream,
  localReady = false,
  opponentReady = false,
  isOpponentPresent = false,
}: BattleVideoContainerProps) => {
  
  // Standby layout - preview phase with ready status badges
  if (layout === 'standby') {
    return (
      <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
        <div className="flex h-full">
          {/* Local Video - LARGE (70%) */}
          <div id="local-video-container" className="relative w-[70%] border-r border-white/10">
            {previewStream ? (
              <StreamPreview stream={previewStream} className="w-full h-full" />
            ) : localTrack ? (
              <VideoAttach track={localTrack} className="w-full h-full" muted />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">Starting camera...</p>
                </div>
              </div>
            )}
            
            {/* Preview/Ready Badge */}
            <div className="absolute top-2 left-2">
              <ReadinessBadge variant={localReady ? 'ready' : 'preview'} />
            </div>
            
            {/* Your Side Label */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                YOUR SIDE
              </span>
              {localCountry && (
                <span className="bg-background/60 text-foreground text-xs px-2 py-1 rounded">
                  {localCountry}
                </span>
              )}
            </div>
            
            {/* Barber Name */}
            <div className="absolute bottom-2 left-2 bg-background/70 backdrop-blur-sm text-foreground text-sm px-2 py-1 rounded">
              {localBarberName}
            </div>
          </div>
          
          {/* Opponent side - SMALLER (30%) */}
          <div id="remote-video-container" className="relative w-[30%] bg-muted/50 flex items-center justify-center">
            {isOpponentPresent ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors",
                  opponentReady 
                    ? "bg-success/20 border-2 border-success" 
                    : "bg-muted-foreground/20 border-2 border-muted-foreground/30"
                )}>
                  <Users className={cn(
                    "w-8 h-8",
                    opponentReady ? "text-success" : "text-muted-foreground"
                  )} />
                </div>
                <p className="text-foreground text-sm font-medium text-center truncate max-w-full px-2">
                  {remoteBarberName}
                </p>
                <ReadinessBadge 
                  variant={opponentReady ? 'ready' : 'not-ready'} 
                  className="mt-2"
                />
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Waiting for</p>
                <p className="text-muted-foreground text-sm">opponent...</p>
              </div>
            )}
            
            {/* Opponent Label */}
            <div className="absolute top-2 right-2">
              <span className="bg-destructive/50 text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
                OPPONENT
              </span>
            </div>
          </div>
        </div>
        
        {/* VS badge */}
        <div className="absolute left-[70%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-destructive flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-black text-xs">VS</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Preview layout - barber gets 70%, waiting indicator 30%
  if (layout === 'preview') {
    return (
      <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
        <div className="flex h-full">
          {/* Local Video - LARGE (70%) */}
          <div id="local-video-container" className="relative w-[70%] border-r border-white/10">
            {localTrack ? (
              <VideoAttach track={localTrack} className="w-full h-full" muted />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                {isConnecting ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm">Your camera</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Your Side Label */}
            <div className="absolute top-2 left-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                YOUR SIDE
              </span>
              {localCountry && (
                <span className="bg-background/60 text-foreground text-xs px-2 py-1 rounded">
                  {localCountry}
                </span>
              )}
            </div>
            
            {/* Barber Name */}
            <div className="absolute bottom-2 left-2 bg-background/70 backdrop-blur-sm text-foreground text-sm px-2 py-1 rounded">
              {localBarberName}
            </div>
          </div>
          
          {/* Waiting for opponent - SMALLER (30%) */}
          <div id="remote-video-container" className="relative w-[30%] bg-muted/50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Waiting for</p>
              <p className="text-muted-foreground text-sm">opponent...</p>
            </div>
            
            {/* Opponent Label */}
            <div className="absolute top-2 right-2">
              <span className="bg-destructive/50 text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
                OPPONENT
              </span>
            </div>
          </div>
        </div>
        
        {/* VS badge - positioned at the boundary */}
        <div className="absolute left-[70%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-destructive flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-black text-xs">VS</span>
          </div>
        </div>

        {/* Battle Info Overlay */}
        <BattleOverlay
          isConnected={isConnected}
          duration={duration}
          viewerCount={viewerCount}
        />
      </div>
    );
  }

  if (layout === 'pip') {
    return (
      <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
        <div className="absolute inset-0">
          {hasOpponent && remoteTrack ? (
            <VideoAttach track={remoteTrack} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {isConnecting ? 'Connecting...' : 'Waiting for opponent...'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 rounded-lg overflow-hidden border-2 border-primary shadow-lg">
          {localTrack ? (
            <VideoAttach track={localTrack} className="w-full h-full" muted />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 bg-black/70 text-[10px] text-foreground px-1.5 py-0.5 rounded">
            YOU
          </div>
        </div>

        <BattleOverlay isConnected={isConnected} duration={duration} viewerCount={viewerCount} />
      </div>
    );
  }

  // Split layout - vertical stack on mobile, side-by-side 50/50 on desktop
  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
      <div className="flex flex-col md:flex-row h-full">
        <div id="local-video-container" className="relative w-full h-1/2 md:w-1/2 md:h-full border-b md:border-b-0 md:border-r border-white/10">
          {localTrack ? (
            <VideoAttach track={localTrack} className="w-full h-full" muted />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              {isConnecting ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">Your camera</p>
                </div>
              )}
            </div>
          )}
          
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
              YOUR SIDE
            </span>
            {localCountry && (
              <span className="bg-background/60 text-foreground text-xs px-2 py-1 rounded">
                {localCountry}
              </span>
            )}
          </div>
          
          <div className="absolute bottom-2 left-2 bg-background/70 backdrop-blur-sm text-foreground text-sm px-2 py-1 rounded">
            {localBarberName}
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-destructive flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-primary-foreground font-black text-sm">VS</span>
          </div>
        </div>

        <div id="remote-video-container" className="relative w-full h-1/2 md:w-1/2 md:h-full">
          {hasOpponent && remoteTrack ? (
            <VideoAttach track={remoteTrack} className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {isConnecting ? 'Connecting...' : 'Waiting for opponent...'}
                </p>
              </div>
            </div>
          )}
          
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {remoteCountry && (
              <span className="bg-background/60 text-foreground text-xs px-2 py-1 rounded">
                {remoteCountry}
              </span>
            )}
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
              OPPONENT
            </span>
          </div>
          
          {hasOpponent && (
            <div className="absolute bottom-2 right-2 bg-background/70 backdrop-blur-sm text-foreground text-sm px-2 py-1 rounded">
              {remoteBarberName}
            </div>
          )}
        </div>
      </div>

      <BattleOverlay isConnected={isConnected} duration={duration} viewerCount={viewerCount} />
    </div>
  );
};

// Overlay component for battle stats
interface BattleOverlayProps {
  isConnected: boolean;
  duration: string;
  viewerCount: number;
}

const BattleOverlay = ({ isConnected, duration, viewerCount }: BattleOverlayProps) => (
  <>
    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full",
        isConnected ? "bg-destructive" : "bg-muted"
      )}>
        <div className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-destructive-foreground animate-pulse" : "bg-muted-foreground"
        )} />
        <span className={cn(
          "text-xs font-bold",
          isConnected ? "text-destructive-foreground" : "text-muted-foreground"
        )}>
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
      
      {isConnected && (
        <div className="bg-background/70 backdrop-blur-sm text-foreground text-xs px-2 py-1 rounded">
          {duration}
        </div>
      )}
    </div>

    {isConnected && viewerCount > 0 && (
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/70 backdrop-blur-sm text-foreground text-xs px-2 py-1 rounded">
        <Users className="w-3 h-3" />
        {viewerCount.toLocaleString()}
      </div>
    )}

    {isConnected && (
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
        {isConnected ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-destructive" />
        )}
      </div>
    )}
  </>
);
