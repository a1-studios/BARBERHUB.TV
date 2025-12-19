import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface AnimatedPrizeCounterProps {
  targetValue: number;
  duration?: number;
  showGrowth?: boolean;
  className?: string;
}

export const AnimatedPrizeCounter = ({
  targetValue,
  duration = 2,
  showGrowth = true,
  className = ''
}: AnimatedPrizeCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [previousValue, setPreviousValue] = useState(0);
  
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 30,
    duration: duration * 1000
  });

  const display = useTransform(spring, (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value / 100);
  });

  useEffect(() => {
    if (targetValue !== previousValue) {
      setPreviousValue(displayValue);
      spring.set(targetValue);
    }
  }, [targetValue, spring, previousValue, displayValue]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (value) => {
      setDisplayValue(Math.round(value));
    });
    return unsubscribe;
  }, [spring]);

  const growth = targetValue - previousValue;

  return (
    <div className={`relative ${className}`}>
      <motion.div
        key={targetValue}
        initial={{ scale: 1 }}
        animate={{ 
          scale: [1, 1.05, 1],
          filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)']
        }}
        transition={{ duration: 0.5 }}
        className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-orange-400 to-primary bg-clip-text text-transparent"
      >
        <motion.span>{display}</motion.span>
      </motion.div>
      
      {showGrowth && growth > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center justify-center gap-1 mt-2 text-emerald-400"
        >
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">
            +{new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0
            }).format(growth / 100)} this week
          </span>
        </motion.div>
      )}
    </div>
  );
};
