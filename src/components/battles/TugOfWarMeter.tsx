import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TugOfWarMeterProps {
  barber1Total: number;
  barber2Total: number;
  barber1Name?: string;
  barber2Name?: string;
}

/**
 * TugOfWarMeter — Animated donation ratio bar
 * Shows the live donation split between two barbers.
 * Updates via props (parent listens to LiveKit Data Channel or polling).
 */
export const TugOfWarMeter = ({
  barber1Total,
  barber2Total,
  barber1Name = 'Barber 1',
  barber2Name = 'Barber 2',
}: TugOfWarMeterProps) => {
  const total = barber1Total + barber2Total;
  const b1Pct = total > 0 ? Math.round((barber1Total / total) * 100) : 50;
  const b2Pct = total > 0 ? 100 - b1Pct : 50;

  if (total === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Labels */}
      <div className="flex justify-between text-xs text-white/70 mb-1">
        <span>{barber1Name}: {barber1Total} BB</span>
        <span>{barber2Total} BB :{barber2Name}</span>
      </div>

      {/* Bar */}
      <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-l-full"
          animate={{ width: `${b1Pct}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <motion.div
          className="h-full bg-gradient-to-l from-purple-500 to-purple-400 rounded-r-full"
          animate={{ width: `${b2Pct}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Percentages */}
      <div className="flex justify-between text-[10px] text-white/50 mt-0.5">
        <span>{b1Pct}%</span>
        <span className="text-white/30">💰 Donation Tug-of-War</span>
        <span>{b2Pct}%</span>
      </div>
    </div>
  );
};
