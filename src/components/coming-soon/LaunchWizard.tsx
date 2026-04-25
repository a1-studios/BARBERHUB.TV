import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { StepRole } from './StepRole';
import { StepSpin } from './StepSpin';
import { StepIntake, type IntakeValues } from './StepIntake';
import { StepLiveFinalize } from './StepLiveFinalize';
import { SegmentedProgress } from './SegmentedProgress';
import { captureAttribution, getCountryFromUrl, getEmailFromUrl } from '@/lib/urlParams';
import type { Prize } from '@/components/vault/VaultSpinWheel';

export type LaunchRole = 'barber' | 'fan';

export interface LaunchWizardState {
  email: string;
  role: LaunchRole | null;
  country: string | null;
  username: string;
  password: string;
  prize: Prize | null;
}

interface LaunchWizardProps {
  onClose: () => void;
}

const TOTAL_STEPS = 4;

/** Direction context so each step can drive AnimatePresence the right way. */
const DirectionContext = createContext<1 | -1>(1);
export const useStepDirection = () => useContext(DirectionContext);

const useIsMobile = () => {
  const [m, setM] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onR = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return m;
};

export const LaunchWizard = ({ onClose }: LaunchWizardProps) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const isMobile = useIsMobile();
  const [state, setState] = useState<LaunchWizardState>({
    email: getEmailFromUrl() ?? '',
    role: null,
    country: getCountryFromUrl() ?? null,
    username: '',
    password: '',
    prize: null,
  });

  useEffect(() => {
    captureAttribution();
  }, []);

  const update = (patch: Partial<LaunchWizardState>) =>
    setState((s) => ({ ...s, ...patch }));

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleIntakeContinue = (values: IntakeValues) => {
    update({
      email: values.email,
      username: values.username,
      country: values.country,
      password: values.password,
    });
    // Persist pending prize to localStorage per spec — Index.tsx claim effect reads this key.
    try {
      if (state.prize && state.role) {
        localStorage.setItem(
          'pending_prize',
          JSON.stringify({
            email: values.email,
            role: state.role,
            prize_id: state.prize.id,
            prize_label: state.prize.label,
            prize_bb: state.prize.bb_value ?? 0,
            prize_type: state.prize.prize_type ?? 'bb',
            duration_months: state.prize.duration_months ?? 0,
            timestamp: Date.now(),
          })
        );
      }
    } catch {
      /* ignore quota */
    }
    goNext();
  };

  const shellMotion = isMobile
    ? {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring' as const, stiffness: 280, damping: 30 },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: 12 },
        transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
      };

  return (
    <DirectionContext.Provider value={direction}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md ${
          isMobile ? 'flex items-end' : 'flex items-center justify-center p-4'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          {...shellMotion}
          className={`relative w-full ${
            isMobile
              ? 'h-[88vh] rounded-t-[28px] pt-3 pb-6 px-5'
              : 'max-w-lg rounded-[24px] p-6 sm:p-8 h-[min(92vh,720px)]'
          } overflow-hidden flex flex-col`}
          style={{
            background: 'rgba(8, 8, 10, 0.72)',
            backdropFilter: 'blur(28px) saturate(140%)',
            WebkitBackdropFilter: 'blur(28px) saturate(140%)',
            border: '1px solid rgba(255, 95, 31, 0.22)',
            boxShadow:
              '0 0 60px rgba(255,95,31,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          {isMobile && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/25 hover:bg-white/40 transition-colors"
            />
          )}

          <div
            aria-hidden
            className="pointer-events-none absolute top-0 inset-x-6 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
            }}
          />

          {!isMobile && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className={`px-1 ${isMobile ? 'mb-5' : 'mb-6'}`}>
            <SegmentedProgress total={TOTAL_STEPS} current={step} />
          </div>

          <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <StepRole
                  key="step-1"
                  value={state.role}
                  onSelect={(role) => {
                    update({ role });
                    goNext();
                  }}
                  onBack={goBack}
                  onSkip={onClose}
                  hideBack={true}
                />
              )}
              {step === 2 && state.role && (
                <StepSpin
                  key="step-2"
                  role={state.role}
                  email={state.email || 'champion'}
                  onResult={(prize) => {
                    update({ prize });
                    goNext();
                  }}
                  onBack={goBack}
                  onSkip={onClose}
                />
              )}
              {step === 3 && (
                <StepIntake
                  key="step-3"
                  initial={{
                    email: state.email,
                    username: state.username,
                    country: state.country ?? undefined,
                    password: state.password,
                  }}
                  prizeLabel={state.prize?.label ?? null}
                  onContinue={handleIntakeContinue}
                  onBack={goBack}
                />
              )}
              {step === 4 && (
                <StepLiveFinalize key="step-4" state={state} onClose={onClose} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </DirectionContext.Provider>
  );
};
