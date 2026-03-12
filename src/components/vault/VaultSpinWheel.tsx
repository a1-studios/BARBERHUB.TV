import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export interface Prize {
  id: string;
  label: string;
  weight: number;
  color: string;
  bb_value?: number;
  prize_type?: 'bb' | 'free_cut' | 'premium_feature' | 'visibility_boost' | 'premium_unlock';
  duration_months?: number;
}

const NEW_FAN_PRIZES: Prize[] = [
  { id: 'bb_15', label: '15 BB Welcome', weight: 40, color: '#FF5F1F', bb_value: 15, prize_type: 'bb' },
  { id: 'bb_25', label: '25 BB Starter', weight: 25, color: '#FF8C00', bb_value: 25, prize_type: 'bb' },
  { id: 'cut_1m', label: '1 Month Free Cut', weight: 20, color: '#002D62', prize_type: 'free_cut', duration_months: 1 },
  { id: 'cut_3m', label: '3 Month Free Cuts', weight: 10, color: '#C0C0C0', prize_type: 'free_cut', duration_months: 3 },
  { id: 'cut_6m', label: '6 Month Free Cuts', weight: 4, color: '#8B5CF6', prize_type: 'free_cut', duration_months: 6 },
  { id: 'cut_1y', label: '1 Year Free Cuts', weight: 1, color: '#FFD700', prize_type: 'free_cut', duration_months: 12 },
];

const EXISTING_FAN_PRIZES: Prize[] = [
  { id: 'bb_10', label: '10 BB', weight: 30, color: '#CD7F32', bb_value: 10, prize_type: 'bb' },
  { id: 'bb_25', label: '25 BB', weight: 20, color: '#FF5F1F', bb_value: 25, prize_type: 'bb' },
  { id: 'cut_1m', label: '1 Month Free Cut', weight: 25, color: '#002D62', prize_type: 'free_cut', duration_months: 1 },
  { id: 'cut_3m', label: '3 Month Free Cuts', weight: 15, color: '#C0C0C0', prize_type: 'free_cut', duration_months: 3 },
  { id: 'cut_6m', label: '6 Month Free Cuts', weight: 8, color: '#8B5CF6', prize_type: 'free_cut', duration_months: 6 },
  { id: 'cut_1y', label: '1 Year Free Cuts', weight: 2, color: '#FFD700', prize_type: 'free_cut', duration_months: 12 },
];

const NEW_BARBER_PRIZES: Prize[] = [
  { id: 'bb_15', label: '15 BB Welcome', weight: 40, color: '#FF5F1F', bb_value: 15, prize_type: 'bb' },
  { id: 'bb_25', label: '25 BB Starter', weight: 25, color: '#FF8C00', bb_value: 25, prize_type: 'bb' },
  { id: 'prem_1w', label: '1 Week Premium', weight: 20, color: '#002D62', prize_type: 'premium_feature', duration_months: 0.25 },
  { id: 'vis_1m', label: '1 Month Visibility', weight: 10, color: '#C0C0C0', prize_type: 'visibility_boost', duration_months: 1 },
  { id: 'prem_1m', label: '1 Month Premium', weight: 4, color: '#8B5CF6', prize_type: 'premium_unlock', duration_months: 1 },
  { id: 'prem_3m', label: '3 Month Premium', weight: 1, color: '#FFD700', prize_type: 'premium_unlock', duration_months: 3 },
];

const EXISTING_BARBER_PRIZES: Prize[] = [
  { id: 'bb_10', label: '10 BB', weight: 30, color: '#CD7F32', bb_value: 10, prize_type: 'bb' },
  { id: 'bb_25', label: '25 BB', weight: 20, color: '#FF5F1F', bb_value: 25, prize_type: 'bb' },
  { id: 'prem_1w', label: '1 Week Premium', weight: 20, color: '#002D62', prize_type: 'premium_feature', duration_months: 0.25 },
  { id: 'vis_1m', label: '1 Month Visibility', weight: 15, color: '#C0C0C0', prize_type: 'visibility_boost', duration_months: 1 },
  { id: 'prem_1m', label: '1 Month Premium', weight: 10, color: '#8B5CF6', prize_type: 'premium_unlock', duration_months: 1 },
  { id: 'prem_3m', label: '3 Month Premium', weight: 5, color: '#FFD700', prize_type: 'premium_unlock', duration_months: 3 },
];

export type PrizeSet = 'new_fan' | 'new_barber' | 'existing_fan' | 'existing_barber';

const PRIZE_SETS: Record<PrizeSet, Prize[]> = {
  new_fan: NEW_FAN_PRIZES,
  new_barber: NEW_BARBER_PRIZES,
  existing_fan: EXISTING_FAN_PRIZES,
  existing_barber: EXISTING_BARBER_PRIZES,
};

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
  prizeSet: PrizeSet;
  onResult: (prize: Prize) => void;
  disabled?: boolean;
  spinLabel?: string;
}

const VaultSpinWheel = ({ prizeSet, onResult, disabled, spinLabel }: VaultSpinWheelProps) => {
  const prizes = PRIZE_SETS[prizeSet];

  const [spinning, setSpinning] = useState(false);
  const [finalRotation, setFinalRotation] = useState(0);
  const [done, setDone] = useState(false);

  const segmentAngle = 360 / prizes.length;

  const spin = useCallback(() => {
    if (spinning || done || disabled) return;
    setSpinning(true);

    const { prize, index } = pickPrize(prizes);
    const segmentCenter = index * segmentAngle + segmentAngle / 2;
    const targetAngle = 360 - segmentCenter;
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
  }, [spinning, done, disabled, prizes, segmentAngle, onResult]);

  return (
    <div className="flex flex-col items-center justify-center px-6 space-y-6">
      <h2 className="text-xl font-black text-white text-center">SPIN YOUR FATE</h2>

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
              <div key={p.id + i}>
                <div
                  className="absolute inset-0"
                  style={{
                    background: `conic-gradient(from ${startAngle}deg, ${p.color} 0deg, ${p.color} ${segmentAngle}deg, transparent ${segmentAngle}deg)`,
                    opacity: 0.85,
                  }}
                />
                <div
                  className="absolute text-[10px] font-bold text-white drop-shadow-lg"
                  style={{
                    left: `calc(50% + ${Math.cos(midAngle - Math.PI / 2) * textRadius}px)`,
                    top: `calc(50% + ${Math.sin(midAngle - Math.PI / 2) * textRadius}px)`,
                    transform: `translate(-50%, -50%) rotate(${startAngle + segmentAngle / 2}deg)`,
                    maxWidth: '60px',
                    textAlign: 'center',
                    lineHeight: '1.1',
                  }}
                >
                  {p.label}
                </div>
              </div>
            );
          })}
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
          whileHover={{ scale: spinning || disabled ? 1 : 1.03 }}
          whileTap={{ scale: spinning || disabled ? 1 : 0.97 }}
          onClick={spin}
          disabled={spinning || disabled}
          className="w-full max-w-xs py-4 rounded-xl font-black text-lg text-black tracking-wider disabled:opacity-60"
          style={{
            background: spinning || disabled
              ? 'linear-gradient(135deg, #666, #888)'
              : 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
            boxShadow: spinning || disabled ? 'none' : '0 0 30px rgba(255,95,31,0.5)',
          }}
        >
          {spinning ? '⏳ SPINNING...' : spinLabel || '🎰 SPIN THE WHEEL'}
        </motion.button>
      )}
    </div>
  );
};

export default VaultSpinWheel;
