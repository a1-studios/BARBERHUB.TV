import { motion, type PanInfo } from 'framer-motion';
import { ReactNode } from 'react';

interface SwipeableStepProps {
  children: ReactNode;
  direction: 1 | -1;
  onSwipeNext?: () => void;
  onSwipeBack?: () => void;
  canAdvance?: boolean;
  className?: string;
}

/**
 * Wraps a wizard step with horizontal swipe gestures + direction-aware spring slide.
 * - Swipe left (offset.x < -80) → next (when canAdvance !== false)
 * - Swipe right (offset.x > 80) → back
 */
export const SwipeableStep = ({
  children,
  direction,
  onSwipeNext,
  onSwipeBack,
  canAdvance = true,
  className = '',
}: SwipeableStepProps) => {
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80 && canAdvance && onSwipeNext) {
      onSwipeNext();
    } else if (info.offset.x > 80 && onSwipeBack) {
      onSwipeBack();
    }
  };

  return (
    <motion.div
      initial={{ x: direction === 1 ? '100%' : '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction === 1 ? '-100%' : '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className={`touch-pan-y ${className}`}
    >
      {children}
    </motion.div>
  );
};
