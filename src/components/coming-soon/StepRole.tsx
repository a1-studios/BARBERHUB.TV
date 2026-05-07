import { motion } from 'framer-motion';
import { Scissors, Heart, ArrowLeft } from 'lucide-react';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import type { LaunchRole } from './LaunchWizard';

interface Props {
  value: LaunchRole | null;
  onSelect: (role: LaunchRole) => void;
  onBack: () => void;
  onSkip: () => void;
}

const haptic = () => { try { navigator.vibrate?.(10); } catch { /* */ } };

export const StepRole = ({ value, onSelect, onBack }: Props) => {
  const direction = useStepDirection();

  const pick = (role: LaunchRole) => {
    haptic();
    onSelect(role);
  };

  return (
    <SwipeableStep direction={direction} canAdvance={false} onSwipeNext={() => { /* no-op */ }} onSwipeBack={onBack}>
      <div className="space-y-5">
        <div className="text-center space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Step 2 of 5</span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Pick your side
          </h2>
          <p className="text-sm text-white/65">Permanent. Choose carefully.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <RoleCard
            icon={<Scissors className="w-6 h-6" />}
            title="I'm a Barber"
            sub="Compete, educate, withdraw BB"
            active={value === 'barber'}
            onClick={() => pick('barber')}
          />
          <RoleCard
            icon={<Heart className="w-6 h-6" />}
            title="I'm a Fan"
            sub="Watch, vote, sponsor"
            active={value === 'fan'}
            onClick={() => pick('fan')}
          />
        </div>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-[11px] uppercase tracking-wider text-white/50 hover:text-white py-2 flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
      </div>
    </SwipeableStep>
  );
};

const RoleCard = ({
  icon, title, sub, active, onClick,
}: { icon: React.ReactNode; title: string; sub: string; active: boolean; onClick: () => void }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileTap={{ scale: 0.97 }}
    className="w-full flex items-center gap-3 p-4 rounded-[14px] text-left transition-all"
    style={{
      background: active ? 'rgba(255,95,31,0.15)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? 'rgba(255,95,31,0.6)' : 'rgba(255,255,255,0.12)'}`,
    }}
  >
    <div
      className="w-12 h-12 rounded-[12px] flex items-center justify-center text-orange-300"
      style={{ background: 'rgba(255,95,31,0.12)', border: '1px solid rgba(255,95,31,0.3)' }}
    >
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-sm font-black uppercase tracking-wide text-white">{title}</div>
      <div className="text-[11px] text-white/55 mt-0.5">{sub}</div>
    </div>
  </motion.button>
);
