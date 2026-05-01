import { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, Loader2, Globe } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { supabase } from '@/integrations/supabase/client';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';

interface Props {
  email: string;
  initialCountry: string | null;
  onContinue: (country: string) => void;
  onBack: () => void;
}

const haptic = () => { try { navigator.vibrate?.(10); } catch { /* */ } };

export const StepFanDetails = ({ email, initialCountry, onContinue, onBack }: Props) => {
  const direction = useStepDirection();
  const [country, setCountry] = useState<string | null>(initialCountry);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!country) { setError('Pick your country'); return; }
    setSubmitting(true);
    setError(null);
    haptic();
    const { data, error: fnErr } = await supabase.functions.invoke('submit-role-details', {
      body: { email, role: 'fan', country_code: country },
    });
    if (fnErr || (data as { error?: unknown } | null)?.error) {
      setError(fnErr?.message ?? 'Could not save details. Try again.');
      setSubmitting(false);
      return;
    }
    onContinue(country);
  };

  return (
    <SwipeableStep direction={direction} canAdvance={!!country && !submitting} onSwipeNext={submit} onSwipeBack={onBack}>
      <div className="space-y-5">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button type="button" onClick={() => { haptic(); onBack(); }} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Step 3 of 5</span>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Where you reppin'?
          </h2>
          <p className="text-sm text-white/65">Pick your country to unlock the spin.</p>
        </div>

        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
          <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid rgba(255,95,31,0.35)', background: 'rgba(0,0,0,0.4)' }}>
            <div className="[&_button]:!rounded-[14px] [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!h-12 [&_button]:!pl-11 [&_button]:!text-white [&_button:hover]:!bg-orange-500/10">
              <CountrySelector value={country} onChange={(c) => { setCountry(c); if (error) setError(null); }} placeholder="Country" />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!country || submitting}
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
