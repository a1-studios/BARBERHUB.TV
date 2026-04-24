import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { StepEmail } from './StepEmail';
import { StepRole } from './StepRole';
import { StepCountry } from './StepCountry';
import { StepSpin } from './StepSpin';
import { StepReveal } from './StepReveal';
import { StepLiveFinalize } from './StepLiveFinalize';
import { SegmentedProgress } from './SegmentedProgress';
import { supabase } from '@/integrations/supabase/client';
import { captureAttribution, getCountryFromUrl, getEmailFromUrl } from '@/lib/urlParams';
import { fbqTrack } from '@/lib/metaPixel';
import { gtagFireLead } from '@/lib/googleAds';
import type { Prize } from '@/components/vault/VaultSpinWheel';

export type LaunchRole = 'barber' | 'fan';
export type LaunchWizardMode = 'waitlist' | 'live';

export interface LaunchWizardState {
  email: string;
  role: LaunchRole | null;
  country: string | null;
  prize: Prize | null;
}

interface LaunchWizardProps {
  onClose: () => void;
  mode?: LaunchWizardMode;
  /** Step number (1–5) the wizard should open on. Default 1. */
  startStep?: number;
  /** Pre-filled role (e.g. when resuming after social OAuth). When set, role + country steps are skipped. */
  prefilledRole?: LaunchRole;
}

const TOTAL_STEPS = 5;

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

export const LaunchWizard = ({
  onClose,
  mode = 'waitlist',
  startStep = 1,
  prefilledRole,
}: LaunchWizardProps) => {
  // Compute initial email + step honoring URL pre-fill and explicit startStep prop.
  const initialEmail = getEmailFromUrl() ?? '';
  const computedStart = startStep > 1
    ? startStep
    : initialEmail
      ? 2 // skip Step 1 if email pre-filled from ad URL
      : 1;
  // Track which step was the first visible one so we can hide Back on it.
  const [firstStep] = useState(computedStart);

  const [step, setStep] = useState(computedStart);
  const directionRef = useRef<1 | -1>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const isMobile = useIsMobile();
  const [state, setState] = useState<LaunchWizardState>({
    email: initialEmail,
    role: prefilledRole ?? null,
    country: getCountryFromUrl() ?? null,
    prize: null,
  });

  useEffect(() => {
    captureAttribution();
  }, []);

  // Auto-fire Lead event once when wizard opens with a pre-filled email
  // (since the user is skipping Step 1 where Lead would normally fire).
  useEffect(() => {
    if (initialEmail && computedStart > 1 && !prefilledRole) {
      (async () => {
        try {
          const eventId = await fbqTrack('Lead', {
            email: initialEmail,
            country: getCountryFromUrl() ?? undefined,
            extra: { signup_method: 'ad_prefill' },
          });
          gtagFireLead(eventId);
          await supabase.from('marketing_leads').upsert(
            {
              email: initialEmail,
              country_code: getCountryFromUrl() ?? null,
              source_url: typeof window !== 'undefined' ? window.location.href : null,
            } as never,
            { onConflict: 'email' }
          );
        } catch (err) {
          console.warn('[LaunchWizard] prefill Lead failed', err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<LaunchWizardState>) =>
    setState((s) => ({ ...s, ...patch }));

  const goNext = () => {
    directionRef.current = 1;
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    directionRef.current = -1;
    setDirection(-1);
    setStep((s) => Math.max(s - 1, firstStep));
  };

  // If prefilledRole was provided (post-OAuth resume) and we're at the role step, jump to spin.
  useEffect(() => {
    if (prefilledRole && step < 4) {
      setStep(4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1 → captures email + fires Lead (Meta + Google) + creates initial lead row
  const handleEmailContinue = async (email: string) => {
    update({ email });
    // Meta Lead — get back the event_id for cross-platform dedup
    const eventId = await fbqTrack('Lead', { email, country: state.country ?? undefined });
    // Google Ads Lead conversion (no-ops if env unset) — same transaction_id
    gtagFireLead(eventId);
    // Insert/upsert lead row early so we have it even if user abandons
    try {
      await supabase.from('marketing_leads').upsert(
        {
          email,
          country_code: state.country,
          source_url: typeof window !== 'undefined' ? window.location.href : null,
        } as never,
        { onConflict: 'email' }
      );
    } catch (err) {
      console.warn('[LaunchWizard] lead upsert failed', err);
    }
    goNext();
  };

  // Mobile bottom-sheet variant uses a different shell motion + classes.
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
              ? 'max-h-[88vh] rounded-t-[28px] pt-3 pb-6 px-5'
              : 'max-w-lg rounded-[24px] p-6 sm:p-8 max-h-[92vh]'
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
          {/* Mobile drag handle */}
          {isMobile && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/25 hover:bg-white/40 transition-colors"
            />
          )}

          {/* Top inner highlight streak */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 inset-x-6 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
            }}
          />

          {/* Close button (desktop) */}
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

          {/* Segmented progress */}
          <div className={`px-1 ${isMobile ? 'mb-5' : 'mb-6'}`}>
            <SegmentedProgress total={TOTAL_STEPS} current={step} />
          </div>

          {/* Steps */}
          <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <StepEmail
                  key="step-1"
                  initialEmail={state.email}
                  onContinue={handleEmailContinue}
                  onSkip={onClose}
                />
              )}
              {step === 2 && (
                <StepRole
                  key="step-2"
                  value={state.role}
                  onSelect={(role) => {
                    update({ role });
                    goNext();
                  }}
                  onBack={goBack}
                  onSkip={onClose}
                />
              )}
              {step === 3 && (
                <StepCountry
                  key="step-3"
                  value={state.country}
                  onChange={(country) => update({ country })}
                  onContinue={goNext}
                  onBack={goBack}
                  onSkip={onClose}
                />
              )}
              {step === 4 && state.role && (
                <StepSpin
                  key="step-4"
                  role={state.role}
                  email={state.email}
                  onResult={(prize) => {
                    update({ prize });
                    goNext();
                  }}
                  onBack={goBack}
                  onSkip={onClose}
                />
              )}
              {step === 5 && (
                mode === 'live'
                  ? <StepLiveFinalize key="step-5" state={state} onClose={onClose} />
                  : <StepReveal key="step-5" state={state} onClose={onClose} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </DirectionContext.Provider>
  );
};
