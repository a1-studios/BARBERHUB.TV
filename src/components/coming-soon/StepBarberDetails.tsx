import { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, Loader2, Globe, MapPin } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { SPECIALTY_TAGS, MAX_SPECIALTIES } from '@/config/specialtyTags';
import { supabase } from '@/integrations/supabase/client';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';

type BarberStatus = 'licensed' | 'student' | 'unlicensed' | 'beginner';

const STATUSES: { id: BarberStatus; label: string; desc: string }[] = [
  { id: 'licensed', label: 'Licensed Pro', desc: 'Active license' },
  { id: 'student', label: 'Student', desc: 'In barber school' },
  { id: 'unlicensed', label: 'Unlicensed Pro', desc: 'Cuts professionally' },
  { id: 'beginner', label: 'Beginner', desc: 'Getting started' },
];

interface Props {
  email: string;
  initialCountry: string | null;
  onContinue: (data: { country: string; zip: string; status: BarberStatus; specialties: string[] }) => void;
  onBack: () => void;
}

const haptic = () => { try { navigator.vibrate?.(10); } catch { /* */ } };

export const StepBarberDetails = ({ email, initialCountry, onContinue, onBack }: Props) => {
  const direction = useStepDirection();
  const [country, setCountry] = useState<string | null>(initialCountry);
  const [zip, setZip] = useState('');
  const [status, setStatus] = useState<BarberStatus | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleSpecialty = (id: string) => {
    haptic();
    setSpecialties((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= MAX_SPECIALTIES) return s;
      return [...s, id];
    });
  };

  const ready = !!country && zip.trim().length >= 2 && !!status && specialties.length >= 1;

  const submit = async () => {
    if (!ready || !country || !status) { setError('Fill all fields'); return; }
    setSubmitting(true);
    setError(null);
    haptic();
    const { data, error: fnErr } = await supabase.functions.invoke('submit-role-details', {
      body: {
        email,
        role: 'barber',
        country_code: country,
        zip_code: zip.trim(),
        barber_status: status,
        specialties,
      },
    });
    if (fnErr || (data as { error?: unknown } | null)?.error) {
      setError(fnErr?.message ?? 'Could not save details. Try again.');
      setSubmitting(false);
      return;
    }
    onContinue({ country, zip: zip.trim(), status, specialties });
  };

  return (
    <SwipeableStep direction={direction} canAdvance={ready && !submitting} onSwipeNext={submit} onSwipeBack={onBack}>
      <div className="space-y-4">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button type="button" onClick={() => { haptic(); onBack(); }} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Step 3 of 5</span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Verify your craft
          </h2>
          <p className="text-xs text-white/65">Quick check so we can match you to the right battles.</p>
        </div>

        {/* Country + Zip */}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
            <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid rgba(255,95,31,0.35)', background: 'rgba(0,0,0,0.4)' }}>
              <div className="[&_button]:!rounded-[12px] [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!h-11 [&_button]:!pl-9 [&_button]:!text-white [&_button:hover]:!bg-orange-500/10 [&_button]:!text-sm">
                <CountrySelector value={country} onChange={(c) => { setCountry(c); if (error) setError(null); }} placeholder="Country" />
              </div>
            </div>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Zip / Postal"
              value={zip}
              onChange={(e) => { setZip(e.target.value); if (error) setError(null); }}
              maxLength={20}
              className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-black/40 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
              style={{ border: '1px solid rgba(255,95,31,0.35)' }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold px-1">Status</p>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map((s) => {
              const active = status === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { haptic(); setStatus(s.id); if (error) setError(null); }}
                  className="relative h-14 rounded-[12px] text-left px-3 transition-all active:scale-[0.97]"
                  style={{
                    background: active ? 'linear-gradient(160deg, rgba(255,95,31,0.18), rgba(255,140,0,0.06))' : 'rgba(255,255,255,0.04)',
                    border: active ? '1.5px solid rgba(255,95,31,0.85)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: active ? '0 0 14px rgba(255,95,31,0.35)' : 'none',
                  }}
                >
                  <div className="text-xs font-black text-white uppercase tracking-wide">{s.label}</div>
                  <div className="text-[10px] text-white/55 mt-0.5">{s.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Specialties */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold px-1">
            Specialties · pick up to {MAX_SPECIALTIES}
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

        {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!ready || submitting}
          className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Unlock the spin <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </SwipeableStep>
  );
};
