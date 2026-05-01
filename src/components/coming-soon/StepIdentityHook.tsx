import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { ArrowRight, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

const schema = z.object({
  email: z.string().trim().toLowerCase().max(255).email('Enter a valid email'),
});

interface Props {
  initialEmail: string;
  onContinue: (email: string) => void;
}

const haptic = () => { try { navigator.vibrate?.(10); } catch { /* */ } };

export const StepIdentityHook = ({ initialEmail, onContinue }: Props) => {
  const direction = useStepDirection();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);

  const submit = async () => {
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    setError(null);
    haptic();
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('register-lead', {
        body: {
          email: parsed.data.email,
          fingerprint: getDeviceFingerprint(),
          source_url: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      });
      if (fnErr || (data as { error?: string } | null)?.error) {
        const msg = (data as { message?: string; error?: string } | null)?.message
          ?? (data as { error?: string } | null)?.error
          ?? fnErr?.message
          ?? 'Could not register your email.';
        setError(msg);
        setSubmitting(false);
        return;
      }
      onContinue(parsed.data.email);
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  };

  return (
    <SwipeableStep direction={direction} canAdvance={!!email && !submitting} onSwipeNext={submit}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
        <div className="text-center space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Step 1 of 5</span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Drop your email
          </h2>
          <p className="text-sm text-white/65">
            One spin. One raffle ticket. One identity per email.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-[12px] text-xs"
          style={{
            background: 'rgba(255,140,0,0.08)',
            border: '1px solid rgba(255,140,0,0.35)',
            color: 'rgba(255,211,122,0.95)',
          }}
        >
          🎟️ <span>15–50 BB + a unique raffle ticket. Sunday draw.</span>
        </motion.div>

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
          <input
            ref={ref}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
            disabled={submitting}
            className="w-full h-12 pl-11 pr-4 rounded-[14px] bg-black/40 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            style={{ border: '1px solid rgba(255,95,31,0.35)' }}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5 px-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Reserving...</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>

        <p className="text-[10px] text-center text-white/40 px-2">
          We use this only to track your raffle ticket. No spam.
        </p>
      </form>
    </SwipeableStep>
  );
};
