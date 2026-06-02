import { motion } from 'framer-motion';
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
  // Swipe/drag gestures intentionally disabled — they were causing visible
  // stutter on the role-selection step on mobile. Users navigate via the
  // explicit Back / Continue buttons rendered inside each step.
  void onSwipeNext;
  void onSwipeBack;
  void canAdvance;

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
      className={`relative ${className}`}
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
