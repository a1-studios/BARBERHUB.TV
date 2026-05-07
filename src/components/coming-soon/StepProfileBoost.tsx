import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Globe, Phone, MapPin, Check } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { SPECIALTY_TAGS, MAX_SPECIALTIES } from '@/config/specialtyTags';
import { supabase } from '@/integrations/supabase/client';
import type { LaunchRole, BarberStatus } from './LaunchWizard';

interface Props {
  email: string;
  role: LaunchRole;
  barberStatus: BarberStatus | null;
  initialCountry: string | null;
  initialPhone: string;
  ticketCode: string;
  onClose: () => void;
}

const haptic = () => { try { navigator.vibrate?.(10); } catch { /* */ } };

/**
 * Post-claim profile prompt — shown ONLY to users who came through the
 * 1-click OAuth flow (and therefore skipped detail capture in Step 2).
 */
export const StepProfileBoost = ({ email, role, barberStatus, initialCountry, initialPhone, ticketCode, onClose }: Props) => {
  const [country, setCountry] = useState<string | null>(initialCountry);
  const [phone, setPhone] = useState(initialPhone);
  const [zip, setZip] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSpecialty = (id: string) => {
    haptic();
    setSpecialties((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= MAX_SPECIALTIES) return s;
      return [...s, id];
    });
  };

  const submit = async () => {
    if (!country) { setError('Pick your country to lock in your prize.'); return; }
    setSubmitting(true);
    setError(null);
    haptic();
    const body: Record<string, unknown> = {
      email, role, country_code: country,
    };
    if (phone.trim()) body.phone_number = phone.trim();
    if (role === 'barber') {
      body.barber_status = barberStatus ?? 'aspiring';
      if (zip.trim()) body.zip_code = zip.trim();
      if (specialties.length > 0) body.specialties = specialties;
    }
    const { data, error: fnErr } = await supabase.functions.invoke('submit-role-details', { body });
    if (fnErr || (data as { error?: unknown } | null)?.error) {
      setError(fnErr?.message ?? 'Could not save. Try again.');
      setSubmitting(false);
      return;
    }
    setDone(true);
    setSubmitting(false);
    setTimeout(onClose, 1400);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-2">
      <div className="text-center space-y-1.5">
        <div className="text-3xl">🎟️</div>
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          Lock in your prize
        </h2>
        <p className="text-xs text-white/70">
          Ticket <span className="font-mono font-bold text-orange-400">{ticketCode}</span> is yours.<br/>
          Finish your profile so we can deliver if you win Sunday.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold px-1">Country <span className="text-red-400/80">*</span></p>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
          <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid rgba(255,95,31,0.35)', background: 'rgba(0,0,0,0.4)' }}>
            <div className="[&_button]:!rounded-[12px] [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!h-11 [&_button]:!pl-9 [&_button]:!text-white [&_button:hover]:!bg-orange-500/10 [&_button]:!text-sm">
              <CountrySelector value={country} onChange={(c) => { setCountry(c); if (error) setError(null); }} placeholder="Country" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold px-1">Phone <span className="text-white/30 normal-case font-medium">(optional)</span></p>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
          <input
            type="tel"
            inputMode="tel"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-black/40 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            style={{ border: '1px solid rgba(255,95,31,0.25)' }}
          />
        </div>
      </div>

      {role === 'barber' && (
        <>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold px-1">Zip / Postal <span className="text-white/30 normal-case font-medium">(optional)</span></p>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Zip / Postal"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                maxLength={20}
                className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-black/40 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                style={{ border: '1px solid rgba(255,95,31,0.25)' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold px-1">
              Specialties · pick up to {MAX_SPECIALTIES} <span className="text-white/30 normal-case font-medium">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTY_TAGS.map((t) => {
                const active = specialties.includes(t.id);
                const disabled = !active && specialties.length >= MAX_SPECIALTIES;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleSpecialty(t.id)}
                    className="text-[11px] px-2.5 py-1.5 rounded-full font-semibold transition-all active:scale-95 disabled:opacity-30"
                    style={{
                      background: active ? 'linear-gradient(135deg, #FF5F1F, #FF8C00)' : 'rgba(255,255,255,0.05)',
                      border: active ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                      color: active ? '#0a0a0f' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    <span className="mr-1">{t.emoji}</span>{t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

      {done ? (
        <div className="w-full h-12 rounded-[14px] flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-cyan-300"
          style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.35)' }}>
          <Check className="w-4 h-4" /> Locked in
        </div>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 24px rgba(255,95,31,0.45)',
          }}
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Lock in my prize'}
        </button>
      )}

      <button type="button" onClick={onClose} className="w-full text-[11px] uppercase tracking-wider text-white/45 hover:text-white py-1">
        Skip for now
      </button>
    </motion.div>
  );
};
