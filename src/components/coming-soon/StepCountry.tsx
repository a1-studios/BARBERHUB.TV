import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';

interface StepCountryProps {
  value: string | null;
  onChange: (code: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const StepCountry = ({
  value,
  onChange,
  onContinue,
  onBack,
  onSkip,
}: StepCountryProps) => {
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
          Repping where?
        </h2>
        <p className="text-sm text-white/60">
          Your flag matters in the global league.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-white block">Country</label>
        <div className="[&_button]:rounded-[14px] [&_button]:border-orange-500/40 [&_button]:bg-background/60 [&_button]:h-11 [&_button]:text-white [&_button:hover]:bg-orange-500/10">
          <CountrySelector
            value={value}
            onChange={onChange}
            placeholder="Select your country"
          />
        </div>
      </div>

      <motion.button
        type="button"
        disabled={!value}
        whileHover={value ? { scale: 1.02 } : undefined}
        whileTap={value ? { scale: 0.98 } : undefined}
        onClick={onContinue}
        className="w-full h-12 rounded-[14px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};
