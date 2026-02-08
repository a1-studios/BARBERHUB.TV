import { motion } from 'framer-motion';

const SponsoredBadge = () => {
  return (
    <motion.span
      className="relative text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary border border-primary/40 px-2.5 py-1 rounded-md overflow-hidden shrink-0"
      animate={{
        boxShadow: [
          '0 0 4px hsl(var(--primary) / 0.3)',
          '0 0 12px hsl(var(--primary) / 0.6)',
          '0 0 4px hsl(var(--primary) / 0.3)',
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Shimmer sweep */}
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      <span className="relative z-10">Sponsored</span>
    </motion.span>
  );
};

export default SponsoredBadge;
