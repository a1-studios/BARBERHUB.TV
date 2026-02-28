import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export interface Prize {
  id: string;
  label: string;
  weight: number;
  color: string;
}

const BARBER_PRIZES: Prize[] = [
  { id: 'tier_bronze', label: '1 Month Bronze Upgrade', weight: 60, color: '#CD7F32' },
  { id: 'bb_100', label: '100 BB Bonus', weight: 25, color: '#FF5F1F' },
  { id: 'tier_silver', label: '1 Month Silver Upgrade', weight: 10, color: '#C0C0C0' },
  { id: 'tier_gold_3m', label: '3 Months Gold Tier', weight: 5, color: '#FFD700' },
];

const FAN_PRIZES: Prize[] = [
  { id: 'bb_25', label: '25 BB Starter Pack', weight: 60, color: '#FF5F1F' },
  { id: 'bb_100', label: '100 BB Bonus', weight: 25, color: '#FF8C00' },
  { id: 'hunter_pass', label: 'Hunter Pass Trial', weight: 10, color: '#002D62' },
  { id: 'contender_pass', label: 'National Contender Pass', weight: 5, color: '#FFD700' },
];

function pickPrize(prizes: Prize[]): { prize: Prize; index: number } {
  const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < prizes.length; i++) {
    r -= prizes[i].weight;
    if (r <= 0) return { prize: prizes[i], index: i };
  }
  return { prize: prizes[0], index: 0 };
}

interface VaultSpinWheelProps {
  role: 'barber' | 'fan';
  onResult: (prize: Prize) => void;
}

const VaultSpinWheel = ({ role, onResult }: VaultSpinWheelProps) => {
  const prizes = role === 'barber' ? BARBER_PRIZES : FAN_PRIZES;
  const [spinning, setSpinning] = useState(false);
  const [finalRotation, setFinalRotation] = useState(0);
  const [done, setDone] = useState(false);

  const segmentAngle = 360 / prizes.length;

  const spin = useCallback(() => {
    if (spinning || done) return;
    setSpinning(true);

    const { prize, index } = pickPrize(prizes);
    // Calculate where the wheel should stop so that the winning segment is at the top (0 degrees)
    // Each segment occupies segmentAngle degrees. Segment 0 starts at 0.
    const segmentCenter = index * segmentAngle + segmentAngle / 2;
    // We want segmentCenter to align with pointer at top (360 - segmentCenter)
    const targetAngle = 360 - segmentCenter;
    // Add multiple full rotations for drama
    const totalRotation = 360 * 6 + targetAngle;
    setFinalRotation(totalRotation);

    setTimeout(() => {
      setDone(true);
      setSpinning(false);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF5F1F', '#FFD700', '#002D62', '#FF8C00'],
      });
      onResult(prize);
    }, 4000);
  }, [spinning, done, prizes, segmentAngle, onResult]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 space-y-6">
      <h2 className="text-xl font-black text-white text-center">SPIN YOUR FATE</h2>
      <p className="text-sm text-gray-400 text-center">
        {role === 'barber' ? 'Barber-exclusive rewards await!' : 'Fan rewards just for you!'}
      </p>

      {/* Pointer */}
      <div className="relative">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-[#FF5F1F]" />

        {/* Wheel */}
        <motion.div
          className="w-64 h-64 md:w-72 md:h-72 rounded-full relative overflow-hidden border-4 border-[#FF5F1F]/60"
          style={{ boxShadow: '0 0 40px rgba(255,95,31,0.4)' }}
          animate={{ rotate: finalRotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
        >
          {prizes.map((p, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
            const textRadius = 80;

            return (
              <div key={p.id}>
                {/* Segment using conic-gradient approach */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `conic-gradient(from ${startAngle}deg, ${p.color} 0deg, ${p.color} ${segmentAngle}deg, transparent ${segmentAngle}deg)`,
                    opacity: 0.85,
                  }}
                />
                {/* Label */}
                <div
                  className="absolute text-xs font-bold text-white drop-shadow-lg"
                  style={{
                    left: `calc(50% + ${Math.cos(midAngle - Math.PI / 2) * textRadius}px)`,
                    top: `calc(50% + ${Math.sin(midAngle - Math.PI / 2) * textRadius}px)`,
                    transform: `translate(-50%, -50%) rotate(${startAngle + segmentAngle / 2}deg)`,
                    maxWidth: '70px',
                    textAlign: 'center',
                    lineHeight: '1.1',
                  }}
                >
                  {p.label}
                </div>
              </div>
            );
          })}
          {/* Center circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#0D0D0D] border-2 border-[#FF5F1F] flex items-center justify-center z-10">
              <span className="text-[#FF5F1F] font-black text-xs">BB</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Spin Button */}
      {!done && (
        <motion.button
          whileHover={{ scale: spinning ? 1 : 1.03 }}
          whileTap={{ scale: spinning ? 1 : 0.97 }}
          onClick={spin}
          disabled={spinning}
          className="w-full max-w-xs py-4 rounded-xl font-black text-lg text-black tracking-wider disabled:opacity-60"
          style={{
            background: spinning
              ? 'linear-gradient(135deg, #666, #888)'
              : 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
            boxShadow: spinning ? 'none' : '0 0 30px rgba(255,95,31,0.5)',
          }}
        >
          {spinning ? '⏳ SPINNING...' : '🎰 SPIN THE WHEEL'}
        </motion.button>
      )}
    </div>
  );
};

export default VaultSpinWheel;
