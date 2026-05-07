import { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { StepIdentityHook } from './StepIdentityHook';
import { StepRole } from './StepRole';
import { StepRaffleSpin } from './StepRaffleSpin';
import { StepClaimAccount } from './StepClaimAccount';
import { StepProfileBoost } from './StepProfileBoost';
import { SegmentedProgress } from './SegmentedProgress';
import { captureAttribution, getCountryFromUrl, getEmailFromUrl } from '@/lib/urlParams';
import { supabase } from '@/integrations/supabase/client';

export type LaunchRole = 'barber' | 'fan';
export type BarberStatus = 'licensed' | 'unlicensed' | 'student' | 'beginner' | 'aspiring';

interface LaunchWizardProps {
  onClose: () => void;
}

const TOTAL_STEPS = 3;

const DirectionContext = createContext<1 | -1>(1);
export const useStepDirection = () => useContext(DirectionContext);

const useIsMobile = () => {
  const [m, setM] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const onR = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return m;
};

interface State {
  email: string;
  role: LaunchRole | null;
  barberStatus: BarberStatus | null;
  country: string | null;
  phone: string;
  ticketCode: string | null;
  // True if the user signed up via OAuth (skipped manual capture)
  isAuthed: boolean;
}

export const LaunchWizard = ({ onClose }: LaunchWizardProps) => {
  // Step 1 = hook, 2 = role, 3 = spin, 4 = claim/profile-boost (final card)
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const isMobile = useIsMobile();
  const [state, setState] = useState<State>({
    email: getEmailFromUrl() ?? '',
    role: null,
    barberStatus: null,
    country: getCountryFromUrl() ?? null,
    phone: '',
    ticketCode: null,
    isAuthed: false,
  });

  useEffect(() => { captureAttribution(); }, []);

  // Detect already-authed session — OAuth users skip role pick (deferred to ProfileCompletionGate
  // post sign-in) and go straight to the spin step.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || !session) return;
      const email = session.user.email ?? '';
      setState((s) => ({ ...s, email: s.email || email, isAuthed: true }));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) return;
      const email = session.user.email ?? '';
      setState((s) => ({ ...s, email: s.email || email, isAuthed: true, role: s.role ?? 'fan' }));
      // OAuth user — register the lead by email then jump straight to spin
      void supabase.functions.invoke('register-lead', { body: { email } }).catch(() => {});
      setStep((cur) => (cur === 1 ? 3 : cur));
      setDirection(1);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const update = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  const goNext = () => { setDirection(1); setStep((s) => Math.min(s + 1, TOTAL_STEPS + 1)); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 1)); };

  const shellMotion = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { type: 'spring' as const, stiffness: 280, damping: 30 } }
    : { initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 12 }, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } };

  return (
    <DirectionContext.Provider value={direction}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md ${isMobile ? 'flex items-end' : 'flex items-center justify-center p-4'}`}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          {...shellMotion}
          className={`relative w-full ${isMobile ? 'h-[88vh] rounded-t-[28px] pt-3 pb-6 px-5' : 'max-w-lg rounded-[24px] p-6 sm:p-8 h-[min(92vh,720px)]'} overflow-hidden flex flex-col`}
          style={{
            background: 'rgba(8, 8, 10, 0.72)',
            backdropFilter: 'blur(28px) saturate(140%)',
            WebkitBackdropFilter: 'blur(28px) saturate(140%)',
            border: '1px solid rgba(255, 95, 31, 0.22)',
            boxShadow: '0 0 60px rgba(255,95,31,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          {isMobile && (
            <button type="button" aria-label="Close" onClick={onClose} className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
          )}
          {!isMobile && (
            <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 z-10">
              <X className="w-4 h-4" />
            </button>
          )}

          <div className={`px-1 ${isMobile ? 'mb-5' : 'mb-6'}`}>
            <SegmentedProgress total={TOTAL_STEPS} current={Math.min(step, TOTAL_STEPS)} />
          </div>

          <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <StepIdentityHook
                  key="step-1"
                  initialEmail={state.email}
                  onContinue={(email) => { update({ email }); goNext(); }}
                />
              )}
              {step === 2 && (
                <StepRole
                  key="step-2"
                  email={state.email}
                  initialRole={state.role}
                  initialCountry={state.country}
                  initialPhone={state.phone}
                  onContinue={({ role, barberStatus, country, phone }) => {
                    update({ role, barberStatus, country, phone });
                    goNext();
                  }}
                  onBack={goBack}
                />
              )}
              {step === 3 && (
                <StepRaffleSpin
                  key="step-3"
                  email={state.email}
                  onResult={({ ticket_code }) => {
                    update({ ticketCode: ticket_code });
                    goNext();
                  }}
                  onBack={goBack}
                />
              )}
              {step === 4 && state.ticketCode && state.role && (
                state.isAuthed ? (
                  <StepProfileBoost
                    key="step-4-boost"
                    email={state.email}
                    role={state.role}
                    barberStatus={state.barberStatus}
                    initialCountry={state.country}
                    initialPhone={state.phone}
                    ticketCode={state.ticketCode}
                    onClose={onClose}
                  />
                ) : (
                  <StepClaimAccount
                    key="step-4-claim"
                    email={state.email}
                    role={state.role}
                    country={state.country}
                    ticketCode={state.ticketCode}
                    bbAwarded={0}
                    onClose={onClose}
                  />
                )
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </DirectionContext.Provider>
  );
};
