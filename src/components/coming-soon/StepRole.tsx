import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Scissors, Heart } from 'lucide-react';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import type { LaunchRole } from './LaunchWizard';

interface StepRoleProps {
  value: LaunchRole | null;
  onSelect: (role: LaunchRole) => void;
  onBack: () => void;
  onSkip: () => void;
  /** Hide the back button (e.g. when this is the first visible step in a pre-fill flow). */
  hideBack?: boolean;
}

const haptic = () => {
  try { navigator.vibrate?.(10); } catch { /* ignore */ }
};

export const StepRole = ({ value, onSelect, onBack, onSkip, hideBack = false }: StepRoleProps) => {
  const direction = useStepDirection();
  const [pending, setPending] = useState<LaunchRole | null>(null);

  const handlePick = (role: LaunchRole) => {
    haptic();
    setPending(role);
    // 180ms scale-pulse + bloom before advancing — quick enough to feel responsive,
    // long enough that the user sees their pick "lock in" before the spin appears.
    setTimeout(() => onSelect(role), 180);
  };

  return (
    <SwipeableStep direction={direction} canAdvance={false} onSwipeBack={onBack}>
      <div className="space-y-6">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          {hideBack ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => { haptic(); onBack(); }}
              className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 transition-colors active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-white/60 hover:text-orange-400 transition-colors"
          >
            Skip
          </button>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Who's joining?
          </h2>
          <p className="text-sm text-white/65">Pick your side of the chair.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <RoleCard
            icon={<Scissors className="w-7 h-7" />}
            title="Barber"
            desc="Compete & earn"
            active={value === 'barber'}
            pulsing={pending === 'barber'}
            onClick={() => handlePick('barber')}
          />
          <RoleCard
            icon={<Heart className="w-7 h-7" />}
            title="Fan"
            desc="Vote & support"
            active={value === 'fan'}
            pulsing={pending === 'fan'}
            onClick={() => handlePick('fan')}
          />
        </div>
      </div>
    </SwipeableStep>
  );
};

const RoleCard = ({
  icon,
  title,
  desc,
  active,
  pulsing,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
  pulsing: boolean;
  onClick: () => void;
}) => (
  <motion.button
    type="button"
    animate={pulsing ? { scale: [1, 1.06, 1] } : { scale: 1 }}
    transition={{ duration: 0.28, ease: 'easeOut' }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`relative h-44 rounded-[18px] flex flex-col items-center justify-center gap-3 transition-all overflow-hidden`}
    style={{
      background: active || pulsing
        ? 'linear-gradient(160deg, rgba(255,95,31,0.18), rgba(255,140,0,0.08))'
        : 'rgba(255,255,255,0.04)',
      border: active || pulsing
        ? '1.5px solid rgba(255,95,31,0.85)'
        : '1px solid rgba(255,95,31,0.22)',
      boxShadow: pulsing
        ? '0 0 30px rgba(255,95,31,0.7), inset 0 0 20px rgba(255,140,0,0.25)'
        : active
          ? '0 0 18px rgba(255,95,31,0.4)'
          : '0 4px 12px rgba(0,0,0,0.2)',
      backdropFilter: 'blur(8px)',
    }}
  >
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center"
      style={{
        background: active || pulsing
          ? 'linear-gradient(135deg, #FF5F1F, #FFB347)'
          : 'rgba(255,95,31,0.15)',
        color: active || pulsing ? '#000' : 'rgb(255,140,0)',
        boxShadow: active || pulsing ? '0 0 20px rgba(255,95,31,0.6)' : 'none',
      }}
    >
      {icon}
    </div>
    <div className="text-center">
      <div className="font-black uppercase tracking-wide text-white text-base">{title}</div>
      <div className="text-[11px] text-white/55 mt-0.5">{desc}</div>
      {pulsing && (
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-orange-300 mt-1.5 animate-pulse">
          Locked in
        </div>
      )}
    </div>
  </motion.button>
);
