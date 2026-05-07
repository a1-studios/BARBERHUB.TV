import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Heart, ArrowLeft, ArrowRight, Loader2, AlertCircle, Globe, Phone, Sparkles } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { supabase } from '@/integrations/supabase/client';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import type { LaunchRole, BarberStatus } from './LaunchWizard';

interface Props {
  email: string;
  initialRole: LaunchRole | null;
  initialCountry: string | null;
  initialPhone: string;
  onContinue: (data: { role: LaunchRole; barberStatus: BarberStatus | null; country: string | null; phone: string }) => void;
  onBack: () => void;
}

const haptic = () => { try { navigator.vibrate?.(10); } catch { /* */ } };

const STATUSES: { id: BarberStatus; label: string; desc: string; aspiring?: boolean }[] = [
  { id: 'licensed',   label: 'Licensed Pro',   desc: 'Active license' },
  { id: 'unlicensed', label: 'Unlicensed Pro', desc: 'Cuts professionally' },
  { id: 'student',    label: 'Student',        desc: 'In barber school' },
  { id: 'beginner',   label: 'Beginner',       desc: 'Just getting started' },
  { id: 'aspiring',   label: 'Aspiring',       desc: 'Thinking about it', aspiring: true },
];

export const StepRole = ({ email, initialRole, initialCountry, initialPhone, onContinue, onBack }: Props) => {
  const direction = useStepDirection();
  const [role, setRole] = useState<LaunchRole | null>(initialRole);
  const [barberStatus, setBarberStatus] = useState<BarberStatus | null>(null);
  const [country, setCountry] = useState<string | null>(initialCountry);
  const [phone, setPhone] = useState(initialPhone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = role === 'fan' || (role === 'barber' && !!barberStatus);

  const submit = async () => {
    if (!role || !ready) return;
    setSubmitting(true);
    setError(null);
    haptic();
    const body: Record<string, unknown> = { email, role };
    if (country) body.country_code = country;
    if (phone.trim()) body.phone_number = phone.trim();
    if (role === 'barber' && barberStatus) body.barber_status = barberStatus;

    const { data, error: fnErr } = await supabase.functions.invoke('submit-role-details', { body });
    if (fnErr || (data as { error?: unknown } | null)?.error) {
      setError(fnErr?.message ?? 'Could not save. Try again.');
      setSubmitting(false);
      return;
    }
    onContinue({ role, barberStatus, country, phone: phone.trim() });
  };

  return (
    <SwipeableStep direction={direction} canAdvance={ready && !submitting} onSwipeNext={submit} onSwipeBack={onBack}>
      <div className="space-y-5">
        <div className="text-center space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Step 2 of 3</span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Pick your side
          </h2>
          <p className="text-sm text-white/65">This locks your lane. Choose carefully.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <RoleCard icon={<Scissors className="w-5 h-5" />} title="Barber" sub="Compete & earn" active={role === 'barber'} onClick={() => { haptic(); setRole('barber'); }} />
          <RoleCard icon={<Heart className="w-5 h-5" />} title="Fan" sub="Watch & sponsor" active={role === 'fan'} onClick={() => { haptic(); setRole('fan'); setBarberStatus(null); }} />
        </div>

        {/* Inline barber sub-status */}
        <AnimatePresence initial={false}>
          {role === 'barber' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5 overflow-hidden"
            >
              <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold px-1 pt-1">Your status</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUSES.map((s) => {
                  const active = barberStatus === s.id;
                  const isAspiring = s.aspiring;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { haptic(); setBarberStatus(s.id); }}
                      className="relative h-14 rounded-[12px] text-left px-3 transition-all"
                      style={{
                        background: active
                          ? 'linear-gradient(160deg, rgba(255,95,31,0.22), rgba(255,140,0,0.08))'
                          : isAspiring
                            ? 'linear-gradient(160deg, rgba(0,240,255,0.08), rgba(255,255,255,0.03))'
                            : 'rgba(255,255,255,0.04)',
                        border: active
                          ? '1.5px solid rgba(255,95,31,0.85)'
                          : isAspiring
                            ? '1px solid rgba(0,240,255,0.35)'
                            : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: active
                          ? '0 0 14px rgba(255,95,31,0.4)'
                          : isAspiring
                            ? '0 0 12px rgba(0,240,255,0.18)'
                            : 'none',
                      }}
                    >
                      {isAspiring && !active && (
                        <Sparkles className="absolute top-1.5 right-1.5 w-3 h-3 text-cyan-300/80" />
                      )}
                      <div className="text-xs font-black text-white uppercase tracking-wide">{s.label}</div>
                      <div className="text-[10px] text-white/55 mt-0.5">{s.desc}</div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional country + phone */}
        {role && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold px-1">Where you reppin' <span className="text-white/30 normal-case font-medium">(optional)</span></p>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
                <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid rgba(255,95,31,0.25)', background: 'rgba(0,0,0,0.4)' }}>
                  <div className="[&_button]:!rounded-[12px] [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!h-11 [&_button]:!pl-9 [&_button]:!text-white [&_button:hover]:!bg-orange-500/10 [&_button]:!text-sm">
                    <CountrySelector value={country} onChange={setCountry} placeholder="Country" />
                  </div>
                </div>
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={40}
                  className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-black/40 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                  style={{ border: '1px solid rgba(255,95,31,0.25)' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!ready || submitting}
          className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95 disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Locking in...</> : <>Spin for my ticket <ArrowRight className="w-4 h-4" /></>}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-[11px] uppercase tracking-wider text-white/45 hover:text-white py-1 flex items-center justify-center gap-1.5"
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
    className="relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-[14px] transition-all"
    style={{
      background: active ? 'rgba(255,95,31,0.18)' : 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${active ? 'rgba(255,95,31,0.7)' : 'rgba(255,255,255,0.1)'}`,
      boxShadow: active ? '0 0 18px rgba(255,95,31,0.4)' : 'none',
    }}
  >
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-orange-300"
      style={{ background: 'rgba(255,95,31,0.12)', border: '1px solid rgba(255,95,31,0.3)' }}
    >
      {icon}
    </div>
    <div className="text-sm font-black uppercase tracking-wide text-white">{title}</div>
    <div className="text-[10px] text-white/55 -mt-0.5">{sub}</div>
  </motion.button>
);
