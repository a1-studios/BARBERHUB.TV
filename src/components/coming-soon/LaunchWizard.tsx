import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { StepRole } from './StepRole';
import { StepAuth } from './StepIdentityHook';
import { StepBucksReward } from './StepBucksReward';
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
  vipCode: string;
  ticketCode: string | null;
  tierColor: TierColor;
  isAuthed: boolean;
}

const readPending = (): Partial<State> => {
  try {
    const raw = sessionStorage.getItem('bh_pending_role');
    if (!raw) return {};
    const p = JSON.parse(raw);
    return {
      email: typeof p.email === 'string' ? p.email : undefined,
      role: p.role ?? undefined,
      barberStatus: p.barberStatus ?? undefined,
      country: p.country ?? undefined,
      phone: p.phone ?? undefined,
      vipCode: typeof p.vipCode === 'string' ? p.vipCode : undefined,
    };
  } catch { return {}; }
};

export const LaunchWizard = ({ onClose }: LaunchWizardProps) => {
  // 1=Role · 2=Auth · 3=BB Reward · 4=Spin · 5=Reveal
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const isMobile = useIsMobile();
  const pending = readPending();
  const [state, setState] = useState<State>({
    email: pending.email ?? getEmailFromUrl() ?? '',
    role: pending.role ?? null,
    barberStatus: pending.barberStatus ?? null,
    country: pending.country ?? getCountryFromUrl() ?? null,
    phone: pending.phone ?? '',
    vipCode: pending.vipCode ?? '',
    ticketCode: null,
    tierColor: 'white',
    isAuthed: false,
  });

  useEffect(() => { captureAttribution(); }, []);

  // Detect existing/incoming session — advance to celebration once authed.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || !session) return;
      const email = session.user.email ?? '';
      setState((s) => ({ ...s, email: s.email || email, isAuthed: true }));
      // If user is already signed-in when wizard mounts, jump to reward (assuming role is set)
      setStep((cur) => (cur < 3 && (s => s.role)(state) ? 3 : cur));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' || !session) return;
      const email = session.user.email ?? '';
      setState((s) => ({ ...s, email: s.email || email, isAuthed: true }));
      setStep((cur) => (cur < 3 ? 3 : cur));
      setDirection(1);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  const goNext = () => { setDirection(1); setStep((s) => Math.min(s + 1, TOTAL_STEPS)); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 1)); };

  const handleClose = useCallback(() => {
    try { sessionStorage.removeItem('bh_pending_role'); } catch { /* */ }
    onClose();
  }, [onClose]);

  const shellMotion = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { type: 'spring' as const, stiffness: 280, damping: 30 } }
    : { initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 12 }, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } };

  return (
    <DirectionContext.Provider value={direction}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md ${isMobile ? 'flex items-end' : 'flex items-center justify-center p-4'}`}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          {...shellMotion}
          className={`relative w-full ${isMobile ? 'h-[92vh] rounded-t-[28px] pt-3 pb-6 px-5' : 'max-w-lg rounded-[24px] p-6 sm:p-8 h-[min(92vh,760px)]'} overflow-hidden flex flex-col`}
          style={{
            background: 'rgba(8, 8, 10, 0.72)',
            backdropFilter: 'blur(28px) saturate(140%)',
            WebkitBackdropFilter: 'blur(28px) saturate(140%)',
            border: '1px solid rgba(255, 95, 31, 0.22)',
            boxShadow: '0 0 60px rgba(255,95,31,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          {isMobile ? (
            <button type="button" aria-label="Close" onClick={handleClose} className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
          ) : (
            <button type="button" aria-label="Close" onClick={handleClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 z-10">
              <X className="w-4 h-4" />
            </button>
          )}

          <div className={`px-1 ${isMobile ? 'mb-4' : 'mb-5'}`}>
            <SegmentedProgress total={TOTAL_STEPS} current={step} />
          </div>

          <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <StepRole
                  key="step-role"
                  email={state.email}
                  initialRole={state.role}
                  initialCountry={state.country}
                  initialPhone={state.phone}
                  initialVipCode={state.vipCode}
                  onContinue={({ role, barberStatus, country, phone, vipCode }) => {
                    update({ role, barberStatus, country, phone, vipCode });
                    try {
                      sessionStorage.setItem('bh_pending_role', JSON.stringify({
                        role, barberStatus, country, phone, vipCode, email: state.email,
                      }));
                    } catch { /* */ }
                    goNext();
                  }}
                  onBack={handleClose}
                />
              )}

              {step === 2 && state.role && (
                <StepAuth
                  key="step-auth"
                  initialEmail={state.email}
                  role={state.role}
                  barberStatus={state.barberStatus}
                  country={state.country}
                  phone={state.phone}
                  vipCode={state.vipCode}
                  onContinue={(email) => { update({ email }); /* wait for SIGNED_IN to advance */ }}
                  onBack={goBack}
                />
              )}

              {step === 3 && (
                <StepBucksReward
                  key="step-bucks"
                  onContinue={goNext}
                />
              )}

              {step === 4 && (
                <StepRaffleSpin
                  key="step-spin"
                  email={state.email}
                  onResult={({ ticket_code, tier_color }) => {
                    update({ ticketCode: ticket_code, tierColor: tier_color });
                    goNext();
                  }}
                  onBack={goBack}
                />
              )}

              {step === 5 && state.ticketCode && (
                <StepTicketReveal
                  key="step-reveal"
                  ticketCode={state.ticketCode}
                  tierColor={state.tierColor}
                  onClose={handleClose}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </DirectionContext.Provider>
  );
};
