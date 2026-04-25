import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';

interface StepCountryProps {
  value: string | null;
  onChange: (code: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  /** When true, the Skip control is hidden and Continue stays disabled until a country is chosen. */
  requireSelection?: boolean;
  /** When provided (and requireSelection is true), shows a 'unlock <prize>' banner. */
  prizeLabel?: string | null;
}

const haptic = () => {
  try { navigator.vibrate?.(10); } catch { /* ignore */ }
};

export const StepCountry = ({
  value,
  onChange,
  onContinue,
  onBack,
  onSkip,
  requireSelection = false,
  prizeLabel = null,
}: StepCountryProps) => {
  const direction = useStepDirection();
  const submit = () => {
    if (!value) return;
    haptic();
    onContinue();
  };

  return (
    <SwipeableStep
      direction={direction}
      canAdvance={!!value}
      onSwipeNext={submit}
      onSwipeBack={onBack}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button
            type="button"
            onClick={() => { haptic(); onBack(); }}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {!requireSelection && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-white/60 hover:text-orange-400 transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Repping where?
          </h2>
          <p className="text-sm text-white/65">
            Your flag matters in the global league.
          </p>
        </div>

        {requireSelection && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] text-xs"
            style={{
              background: 'rgba(255,140,0,0.08)',
              border: '1px solid rgba(255,140,0,0.35)',
              color: 'rgba(255,211,122,0.95)',
            }}
          >
            <Lock className="w-3.5 h-3.5 shrink-0 text-orange-400" />
            <span>
              {prizeLabel
                ? <>Select your country to unlock <span className="font-bold">{prizeLabel}</span>.</>
                : <>Select your country to claim your prize.</>}
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-bold text-orange-400 block px-1">
            Country
          </label>
          <div
            className="rounded-[14px] overflow-hidden"
            style={{
              border: '1px solid rgba(255,95,31,0.35)',
              background: 'rgba(0,0,0,0.4)',
              boxShadow: '0 0 0 0 rgba(255,95,31,0)',
            }}
          >
            <div className="[&_button]:!rounded-[14px] [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!h-14 [&_button]:!text-white [&_button:hover]:!bg-orange-500/10 [&_button:focus-visible]:!ring-2 [&_button:focus-visible]:!ring-orange-500">
              <CountrySelector
                value={value}
                onChange={onChange}
                placeholder="Select your country"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!value}
          onClick={submit}
          onPointerDown={() => value && haptic()}
          className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </SwipeableStep>
  );
};
