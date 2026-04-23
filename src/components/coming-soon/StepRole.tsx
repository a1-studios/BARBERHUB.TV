import { motion } from 'framer-motion';
import { ArrowLeft, Scissors, Heart } from 'lucide-react';
import type { LaunchRole } from './LaunchWizard';

interface StepRoleProps {
  value: LaunchRole | null;
  onSelect: (role: LaunchRole) => void;
  onBack: () => void;
  onSkip: () => void;
}

export const StepRole = ({ value, onSelect, onBack, onSkip }: StepRoleProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between -mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-white/60 hover:text-orange-400 transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="text-center space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          Who's joining?
        </h2>
        <p className="text-sm text-white/60">Pick your side of the chair.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RoleCard
          icon={<Scissors className="w-7 h-7" />}
          title="Barber"
          desc="Compete & earn"
          active={value === 'barber'}
          onClick={() => onSelect('barber')}
        />
        <RoleCard
          icon={<Heart className="w-7 h-7" />}
          title="Fan"
          desc="Vote & support"
          active={value === 'fan'}
          onClick={() => onSelect('fan')}
        />
      </div>
    </motion.div>
  );
};

const RoleCard = ({
  icon,
  title,
  desc,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) => (
  <motion.button
    type="button"
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`relative h-36 rounded-[14px] border-2 flex flex-col items-center justify-center gap-2 transition-all ${
      active
        ? 'border-orange-500 bg-orange-500/15 shadow-lg shadow-orange-500/30'
        : 'border-orange-500/30 bg-background/60 hover:border-orange-500/60'
    }`}
  >
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center ${
        active ? 'bg-orange-500 text-black' : 'bg-orange-500/15 text-orange-400'
      }`}
    >
      {icon}
    </div>
    <div className="text-center">
      <div className="font-black uppercase tracking-wide text-white text-sm">{title}</div>
      <div className="text-[11px] text-white/55">{desc}</div>
    </div>
  </motion.button>
);
