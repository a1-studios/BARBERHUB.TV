import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { StepEmail } from './StepEmail';
import { StepRole } from './StepRole';
import { StepCountry } from './StepCountry';
import { StepSpin } from './StepSpin';
import { StepReveal } from './StepReveal';
import { fbqTrack } from '@/lib/metaPixel';
import { supabase } from '@/integrations/supabase/client';
import { captureAttribution, getCountryFromUrl } from '@/lib/urlParams';
import type { Prize } from '@/components/vault/VaultSpinWheel';

export type LaunchRole = 'barber' | 'fan';

export interface LaunchWizardState {
  email: string;
  role: LaunchRole | null;
  country: string | null;
  prize: Prize | null;
}

interface LaunchWizardProps {
  onClose: () => void;
}

const TOTAL_STEPS = 5;

export const LaunchWizard = ({ onClose }: LaunchWizardProps) => {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<LaunchWizardState>({
    email: '',
    role: null,
    country: getCountryFromUrl() ?? null,
    prize: null,
  });

  useEffect(() => {
    captureAttribution();
  }, []);

  const update = (patch: Partial<LaunchWizardState>) =>
    setState((s) => ({ ...s, ...patch }));

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  // Step 1 → captures email + fires Lead + creates initial lead row
  const handleEmailContinue = async (email: string) => {
    update({ email });
    // Fire Lead event (pixel + CAPI)
    void fbqTrack('Lead', { email, country: state.country ?? undefined });
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
    next();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-background border border-orange-500/30 rounded-[20px] shadow-2xl shadow-orange-500/20 p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const idx = i + 1;
            const active = idx === step;
            const done = idx < step;
            return (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  active
                    ? 'w-8 bg-orange-500'
                    : done
                    ? 'w-4 bg-orange-500/60'
                    : 'w-4 bg-white/15'
                }`}
              />
            );
          })}
        </div>

        <AnimatePresence mode="wait">
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
                next();
              }}
              onBack={back}
              onSkip={onClose}
            />
          )}
          {step === 3 && (
            <StepCountry
              key="step-3"
              value={state.country}
              onChange={(country) => update({ country })}
              onContinue={next}
              onBack={back}
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
                next();
              }}
              onBack={back}
              onSkip={onClose}
            />
          )}
          {step === 5 && (
            <StepReveal
              key="step-5"
              state={state}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
