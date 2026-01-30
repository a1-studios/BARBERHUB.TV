import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGestureVerification, SwipeMetrics } from '@/hooks/useGestureVerification';
import { HapticFeedback } from '@/utils/hapticFeedback';

interface ClipperSwipeVerifierProps {
  onVerified: (metrics: SwipeMetrics) => void;
  onFailed: (reason: string) => void;
  disabled?: boolean;
}

export const ClipperSwipeVerifier = ({ 
  onVerified, 
  onFailed, 
  disabled = false 
}: ClipperSwipeVerifierProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTrail, setShowTrail] = useState(false);
  const [trailPoints, setTrailPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [hint, setHint] = useState<string | null>(null);
  
  const clipperX = useMotionValue(0);
  const clipperY = useMotionValue(0);
  
  const {
    isTracking,
    startTracking,
    trackPoint,
    endTracking,
    validateHumanGesture,
    reset: resetGesture,
  } = useGestureVerification();

  // Reset clipper position
  const resetPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      animate(clipperX, 20, { type: 'spring', stiffness: 300, damping: 25 });
      animate(clipperY, rect.height - 60, { type: 'spring', stiffness: 300, damping: 25 });
    }
    setShowTrail(false);
    setTrailPoints([]);
    resetGesture();
  }, [clipperX, clipperY, resetGesture]);

  // Initialize position
  useEffect(() => {
    resetPosition();
  }, [resetPosition]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    startTracking(x, y);
    setShowTrail(true);
    setTrailPoints([{ x, y }]);
    setHint(null);
    HapticFeedback.vote();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isTracking || disabled) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    clipperX.set(x - 20);
    clipperY.set(y - 20);
    trackPoint(x, y);
    setTrailPoints(prev => [...prev, { x, y }]);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isTracking || disabled) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const metrics = endTracking(x, y);
    
    if (metrics) {
      const result = validateHumanGesture(metrics);
      
      if (result.valid) {
        HapticFeedback.winner();
        onVerified(metrics);
      } else {
        HapticFeedback.error();
        setHint(result.reason || 'Try again');
        onFailed(result.reason || 'Invalid gesture');
        
        // Reset after brief delay
        setTimeout(resetPosition, 800);
      }
    } else {
      resetPosition();
    }
  };

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="text-center space-y-1">
        <p className="text-lg font-semibold text-foreground">
          Swipe the Clipper to Confirm ✂️
        </p>
        <p className="text-sm text-muted-foreground">
          Drag diagonally ↗ from bottom-left to top-right
        </p>
      </div>

      {/* Swipe Zone */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={cn(
          "relative w-full h-32 rounded-xl overflow-hidden touch-none select-none",
          "bg-gradient-to-br from-muted/50 to-muted/20",
          "border border-primary/20",
          disabled && "opacity-50 pointer-events-none"
        )}
        style={{ touchAction: 'none' }}
      >
        {/* Target zone indicator */}
        <div className="absolute inset-4 border-2 border-dashed border-primary/20 rounded-lg">
          {/* Diagonal guide */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <line 
              x1="10%" 
              y1="90%" 
              x2="90%" 
              y2="10%" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeDasharray="8 4"
              className="text-primary"
            />
          </svg>
          
          {/* Start indicator */}
          <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
            <span className="text-xs text-primary font-bold">↗</span>
          </div>
          
          {/* End indicator */}
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center">
            <span className="text-xs text-cyan-400">✓</span>
          </div>
        </div>

        {/* Trail effect */}
        {showTrail && trailPoints.length > 1 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d={`M ${trailPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
              fill="none"
              stroke="url(#trailGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-lg"
            />
            <defs>
              <linearGradient id="trailGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(187 100% 50%)" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        )}

        {/* Clipper icon */}
        <motion.div
          className={cn(
            "absolute w-10 h-10 flex items-center justify-center",
            "bg-primary rounded-lg shadow-lg cursor-grab active:cursor-grabbing",
            isTracking && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-background"
          )}
          style={{ 
            x: clipperX, 
            y: clipperY,
            rotate: -45,
          }}
        >
          <Scissors className="w-5 h-5 text-primary-foreground" />
        </motion.div>
      </div>

      {/* Hint message */}
      {hint && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-destructive font-medium"
        >
          {hint}
        </motion.p>
      )}
    </div>
  );
};
