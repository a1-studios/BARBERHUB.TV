import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Flame } from 'lucide-react';

interface InteractiveVoteSliderProps {
  barber1Name: string;
  barber2Name: string;
  onVote: (choice: 1 | 2) => void;
  disabled?: boolean;
}

export const InteractiveVoteSlider = ({
  barber1Name,
  barber2Name,
  onVote,
  disabled = false
}: InteractiveVoteSliderProps) => {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // Transform x position to background color
  const backgroundColor = useTransform(
    x,
    [-100, 0, 100],
    ['rgba(249, 115, 22, 0.3)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 217, 255, 0.3)']
  );

  // Transform for glow effects
  const leftGlow = useTransform(x, [-100, 0], [1, 0]);
  const rightGlow = useTransform(x, [0, 100], [0, 1]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    if (disabled || hasVoted) return;

    const threshold = 60;
    
    if (info.offset.x < -threshold) {
      // Voted for barber 1 (left)
      setHasVoted(true);
      onVote(1);
    } else if (info.offset.x > threshold) {
      // Voted for barber 2 (right)
      setHasVoted(true);
      onVote(2);
    }
  };

  if (hasVoted) {
    return (
      <div className="w-full py-2 px-4 bg-gradient-to-r from-primary/20 via-black/60 to-cyan/20 rounded-full border border-primary/30 text-center">
        <span className="text-white/90 text-xs font-semibold">✓ Vote Recorded!</span>
      </div>
    );
  }

  return (
    <div 
      ref={constraintsRef}
      className="relative w-full h-12 rounded-full overflow-hidden border border-cyan/30"
    >
      {/* Background with dynamic color */}
      <motion.div 
        className="absolute inset-0"
        style={{ backgroundColor }}
      />
      
      {/* Left side label */}
      <motion.div 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-primary truncate max-w-[30%]"
        style={{ opacity: useTransform(x, [-100, -20], [1, 0.5]) }}
      >
        ← {barber1Name}
      </motion.div>
      
      {/* Right side label */}
      <motion.div 
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-cyan truncate max-w-[30%]"
        style={{ opacity: useTransform(x, [20, 100], [0.5, 1]) }}
      >
        {barber2Name} →
      </motion.div>

      {/* Left glow effect */}
      <motion.div 
        className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-primary/50 to-transparent pointer-events-none"
        style={{ opacity: leftGlow }}
      />
      
      {/* Right glow effect */}
      <motion.div 
        className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan/50 to-transparent pointer-events-none"
        style={{ opacity: rightGlow }}
      />

      {/* Draggable thumb */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ scale: 1.1 }}
        className={`absolute top-1/2 left-1/2 -translate-y-1/2 -ml-6 w-12 h-10 
          bg-gradient-to-br from-primary to-orange-600 rounded-full 
          flex items-center justify-center cursor-grab active:cursor-grabbing
          shadow-lg shadow-primary/30 border-2 border-white/20
          ${isDragging ? 'scale-110' : ''}`}
      >
        <Flame className="w-5 h-5 text-white" />
      </motion.div>

      {/* Center instruction */}
      {!isDragging && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-white/40 text-[9px] sm:text-[10px] font-medium whitespace-nowrap">
            ← Slide to Vote →
          </span>
        </div>
      )}
    </div>
  );
};
