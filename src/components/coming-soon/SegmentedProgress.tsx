import { motion } from 'framer-motion';

interface SegmentedProgressProps {
  total: number;
  current: number; // 1-indexed
}

/**
 * 5-segment orange progress bar. Inactive = subtle white. Active = orange→amber
 * pill with glow + animated shimmer sweep. Completed = solid orange (no glow).
 */
export const SegmentedProgress = ({ total, current }: SegmentedProgressProps) => {
  return (
    <div className="flex items-center gap-1.5 w-full">
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const active = idx === current;
        const done = idx < current;
        return (
          <div
            key={idx}
            className="relative h-1.5 flex-1 rounded-full overflow-hidden bg-white/10"
          >
            {(active || done) && (
              <motion.div
                layout
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
                  boxShadow: active
                    ? '0 0 18px rgba(255,95,31,0.65), 0 0 6px rgba(255,140,0,0.5)'
                    : 'none',
                }}
              />
            )}
            {active && (
              <motion.div
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                  transform: 'skewX(-20deg)',
                }}
                animate={{ x: ['0%', '450%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
