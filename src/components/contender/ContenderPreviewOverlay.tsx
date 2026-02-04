import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Camera, Volume2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Phase = 'preview' | 'standby' | 'countdown' | 'live';

interface ContenderPreviewOverlayProps {
  phase: Phase;
  isReady: boolean;
  opponentReady: boolean;
  opponentName: string;
  isOpponentPresent: boolean;
  countdown: number;
  onCountdownComplete?: () => void;
}

export const ContenderPreviewOverlay = memo(function ContenderPreviewOverlay({
  phase,
  isReady,
  opponentReady,
  opponentName,
  isOpponentPresent,
  countdown,
  onCountdownComplete,
}: ContenderPreviewOverlayProps) {
  const [displayCountdown, setDisplayCountdown] = useState(countdown);

  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      setDisplayCountdown(countdown);
      
      const interval = setInterval(() => {
        setDisplayCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onCountdownComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [phase, countdown, onCountdownComplete]);

  // Don't show overlay when live
  if (phase === 'live') return null;

  return (
    <AnimatePresence mode="wait">
      {/* Preview phase - Camera tips */}
      {phase === 'preview' && !isReady && (
        <motion.div
          key="preview-tips"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute bottom-24 left-4 right-4 md:left-auto md:right-auto md:bottom-28 md:left-4 max-w-xs"
        >
          <div className="bg-background/90 backdrop-blur-md rounded-xl p-4 border border-cyan/20 shadow-lg">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Camera Check
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                <span>Good lighting on your face</span>
              </li>
              <li className="flex items-start gap-2">
                <Camera className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                <span>Frame your work area clearly</span>
              </li>
              <li className="flex items-start gap-2">
                <Volume2 className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
                <span>Test your microphone</span>
              </li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* Standby phase - Waiting status */}
      {phase === 'standby' && (
        <motion.div
          key="standby-status"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-background/80 backdrop-blur-md rounded-2xl p-6 border border-cyan/30 shadow-2xl text-center max-w-sm mx-4">
            <div className="flex items-center justify-center gap-8 mb-4">
              {/* Your status */}
              <div className="text-center">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2 mx-auto transition-colors",
                  isReady ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                )}>
                  <CheckCircle2 className={cn("w-6 h-6", isReady && "fill-green-500/30")} />
                </div>
                <p className="text-xs font-medium text-foreground">You</p>
                <p className={cn("text-xs", isReady ? "text-green-500" : "text-muted-foreground")}>
                  {isReady ? 'Ready' : 'Not ready'}
                </p>
              </div>

              <span className="text-2xl font-black text-muted-foreground">VS</span>

              {/* Opponent status */}
              <div className="text-center">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2 mx-auto transition-colors",
                  !isOpponentPresent ? "bg-muted text-muted-foreground animate-pulse" :
                  opponentReady ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                )}>
                  <CheckCircle2 className={cn("w-6 h-6", opponentReady && "fill-green-500/30")} />
                </div>
                <p className="text-xs font-medium text-foreground truncate max-w-[80px]">
                  {isOpponentPresent ? opponentName : 'Waiting...'}
                </p>
                <p className={cn("text-xs", 
                  !isOpponentPresent ? "text-muted-foreground" :
                  opponentReady ? "text-green-500" : "text-muted-foreground"
                )}>
                  {!isOpponentPresent ? 'Not joined' : opponentReady ? 'Ready' : 'Not ready'}
                </p>
              </div>
            </div>

            {isReady && !opponentReady && (
              <p className="text-sm text-muted-foreground">
                Waiting for opponent to be ready...
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Countdown phase */}
      {phase === 'countdown' && (
        <motion.div
          key="countdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
        >
          <motion.div
            key={displayCountdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center"
          >
            <div className="relative">
              <span className="text-[120px] md:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-b from-primary to-destructive drop-shadow-2xl">
                {displayCountdown}
              </span>
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="absolute inset-0 blur-xl bg-gradient-to-b from-primary/50 to-destructive/50 rounded-full"
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl md:text-2xl font-bold text-foreground mt-4"
            >
              🔥 BATTLE STARTING 🔥
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
