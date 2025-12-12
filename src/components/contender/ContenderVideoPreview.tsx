import { memo, forwardRef } from 'react';
import { Video, VideoOff, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContenderVideoPreviewProps {
  isYourCamera: boolean;
  hasStream: boolean;
  isVideoEnabled: boolean;
  isStreaming: boolean;
  barberName: string;
  barberPosition: number;
  isMobile: boolean;
}

export const ContenderVideoPreview = memo(forwardRef<HTMLVideoElement, ContenderVideoPreviewProps>(
  function ContenderVideoPreview({
    isYourCamera,
    hasStream,
    isVideoEnabled,
    isStreaming,
    barberName,
    barberPosition,
    isMobile,
  }, ref) {
    if (!isYourCamera) {
      // Opponent's stream placeholder
      return (
        <div className={cn(
          "relative bg-muted/10 overflow-hidden",
          isMobile 
            ? "flex-1 border-t border-border" 
            : "aspect-video rounded-xl border border-border"
        )}>
          <div className={cn(
            "absolute z-10 bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full font-bold text-xs md:text-sm",
            isMobile ? "top-2 left-2" : "top-4 left-4"
          )}>
            OPPONENT
          </div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 md:gap-4">
            <div className={cn(
              "rounded-full bg-white/10 flex items-center justify-center",
              isMobile ? "w-12 h-12" : "w-20 h-20"
            )}>
              <Users className={cn(isMobile ? "w-6 h-6" : "w-10 h-10", "text-white/40")} />
            </div>
            <p className="text-white/60 text-center px-4 text-xs md:text-base">
              {barberName}
              <br />
              <span className="text-[10px] md:text-sm">Waiting for stream...</span>
            </p>
          </div>
          
          <div className={cn(
            "absolute bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 md:px-3 md:py-2",
            isMobile ? "bottom-2 left-2" : "bottom-4 left-4"
          )}>
            <p className="font-bold text-xs md:text-base">{barberName}</p>
            <p className="text-[10px] md:text-xs text-white/60">Barber #{barberPosition}</p>
          </div>
        </div>
      );
    }

    // Your camera view
    return (
      <div className={cn(
        "relative bg-muted/10 overflow-hidden",
        isMobile 
          ? "flex-[3] border-b border-cyan/20" 
          : "aspect-video rounded-xl border-2 border-primary/50"
      )}>
        {/* Your Side Label */}
        <div className={cn(
          "absolute z-10 bg-primary text-primary-foreground px-2 py-0.5 md:px-3 md:py-1 rounded-full font-bold text-xs md:text-sm",
          isMobile ? "top-16 left-3" : "top-4 left-4"
        )}>
          YOUR CAMERA
        </div>
        
        {/* Live Status */}
        {isStreaming && (
          <div className={cn(
            "absolute z-10 flex items-center gap-1.5 md:gap-2 bg-red-600 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full",
            isMobile ? "top-16 right-3" : "top-4 right-4"
          )}>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="font-bold text-xs md:text-sm">LIVE</span>
          </div>
        )}
        
        {/* Video Preview */}
        {hasStream ? (
          <video
            ref={ref}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              !isVideoEnabled && "hidden"
            )}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4">
            <div className={cn(
              "rounded-full bg-primary/20 flex items-center justify-center animate-pulse",
              isMobile ? "w-16 h-16" : "w-20 h-20"
            )}>
              <Video className={cn(isMobile ? "w-8 h-8" : "w-10 h-10", "text-primary")} />
            </div>
            <p className="text-muted-foreground text-sm md:text-base">Starting camera...</p>
          </div>
        )}
        
        {/* Video disabled overlay */}
        {hasStream && !isVideoEnabled && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <VideoOff className={cn(isMobile ? "w-12 h-12" : "w-16 h-16", "text-muted-foreground")} />
          </div>
        )}
        
        {/* Barber name */}
        <div className={cn(
          "absolute bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 md:px-3 md:py-2",
          isMobile ? "bottom-3 left-3" : "bottom-4 left-4"
        )}>
          <p className="font-bold text-sm md:text-base">{barberName}</p>
          <p className="text-[10px] md:text-xs text-white/60">Barber #{barberPosition}</p>
        </div>
      </div>
    );
  }
));
