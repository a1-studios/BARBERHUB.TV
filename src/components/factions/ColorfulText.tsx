import { motion } from 'framer-motion';

const VIBRANT_COLORS = [
  'hsl(var(--cyan))',
  'hsl(30, 100%, 60%)',    // orange
  'hsl(320, 90%, 60%)',    // magenta
  'hsl(90, 80%, 55%)',     // lime
  'hsl(45, 100%, 55%)',    // gold
];

interface ColorfulTextProps {
  text: string;
  highlightEnd?: number; // index where the "title" portion ends (bold + brighter)
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03 },
  },
};

const letterVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

const ColorfulText = ({ text, highlightEnd = 0, className = '' }: ColorfulTextProps) => {
  return (
    <motion.span
      className={`inline-flex flex-wrap items-center justify-center ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {text.split('').map((char, i) => {
        const color = VIBRANT_COLORS[i % VIBRANT_COLORS.length];
        const isHighlight = i < highlightEnd;

        return (
          <motion.span
            key={`${char}-${i}`}
            variants={letterVariants}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              color,
              textShadow: `0 0 8px ${color}`,
              display: char === ' ' ? 'inline' : 'inline-block',
            }}
            className={isHighlight ? 'font-black' : 'font-bold'}
          >
            <motion.span
              animate={{ y: [-1.5, 1.5, 0] }}
              transition={{
                duration: 1.5 + (i % 3) * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.05,
              }}
              style={{ display: char === ' ' ? 'inline' : 'inline-block' }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          </motion.span>
        );
      })}
    </motion.span>
  );
};

export default ColorfulText;
