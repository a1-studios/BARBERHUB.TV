import { motion } from 'framer-motion';

interface ScratchRevealProps {
  activeIndex: number;
  variant?: 'silver' | 'gold';
}

const ScratchReveal = ({ activeIndex, variant = 'silver' }: ScratchRevealProps) => {
  const gradient =
    variant === 'gold'
      ? 'bg-gradient-to-r from-amber-500/60 via-yellow-300/80 to-amber-600/60'
      : 'bg-gradient-to-r from-gray-400/60 via-white/80 to-gray-500/60';

  return (
    <motion.div
      key={`scratch-${activeIndex}`}
      className={`absolute inset-0 ${gradient} z-20 pointer-events-none`}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{
        clipPath: [
          'inset(0 100% 0 0)',
          'inset(0 0% 0 0)',
          'inset(0 0% 0 100%)',
        ],
      }}
      transition={{
        duration: 0.8,
        ease: 'easeInOut',
        times: [0, 0.5, 1],
      }}
    />
  );
};

export default ScratchReveal;
