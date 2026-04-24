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
      initial={{ x: direction === 1 ? '100%' : '-100%', opacity: 0, scale: 0.98 }}
      animate={{ x: 0, opacity: 1, scale: [0.98, 1.02, 1] }}
      exit={{ x: direction === 1 ? '-100%' : '100%', opacity: 0 }}
      transition={{
        x: { type: 'spring', stiffness: 320, damping: 32 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.45, times: [0, 0.55, 1], ease: 'easeOut' },
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className={`relative touch-pan-y ${className}`}
    >
      {/* 180ms whoosh radial flash on enter */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0.55, scale: 0.6 }}
        animate={{ opacity: 0, scale: 1.4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.35), rgba(255,140,0,0.12) 40%, transparent 70%)',
        }}
      />
      {children}
    </motion.div>
  );
};
