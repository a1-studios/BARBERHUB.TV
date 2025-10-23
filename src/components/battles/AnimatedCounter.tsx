import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
}

export const AnimatedCounter = ({ value, className = '', duration = 1000 }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const startValue = prevValue.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeOutCubic);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValue.current = endValue;
      }
    };

    if (startValue !== endValue) {
      requestAnimationFrame(animate);
    }
  }, [value, duration]);

  return (
    <motion.span
      key={value}
      initial={{ scale: 1.2, color: '#22c55e' }}
      animate={{ scale: 1, color: 'inherit' }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
};
