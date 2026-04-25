import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, AlertCircle, Mail, User, Lock, Globe } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import { supabase } from '@/integrations/supabase/client';
import { fbqTrack } from '@/lib/metaPixel';
import { gtagFireLead } from '@/lib/googleAds';

const intakeSchema = z.object({
  email: z.string().trim().toLowerCase().max(255).email('Enter a valid email'),
  username: z.string().trim().min(2, 'Min 2 characters').max(40, 'Max 40 characters'),
  country: z.string().min(2, 'Pick your country'),
  password: z.string().min(8, 'Min 8 characters').max(72, 'Too long'),
});

export interface IntakeValues {
  email: string;
  username: string;
  country: string;
  password: string;
}

interface StepIntakeProps {
  initial: Partial<IntakeValues>;
  prizeLabel: string | null;
  onContinue: (values: IntakeValues) => void;
  onBack: () => void;
}

const haptic = () => {
  try { navigator.vibrate?.(10); } catch { /* ignore */ }
};

export const StepIntake = ({ initial, prizeLabel, onContinue, onBack }: StepIntakeProps) => {
  const direction = useStepDirection();
  const [email, setEmail] = useState(initial.email ?? '');
  const [username, setUsername] = useState(initial.username ?? '');
  const [country, setCountry] = useState<string | null>(initial.country ?? null);
  const [password, setPassword] = useState(initial.password ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);

  const submit = async () => {
    const parsed = intakeSchema.safeParse({ email, username, country: country ?? '', password });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    haptic();

    const values = parsed.data;

    // Fire Lead pixel + persist marketing_leads row (best-effort, non-blocking)
    try {
      const eventId = await fbqTrack('Lead', {
        email: values.email,
        country: values.country,
        extra: { signup_method: 'email_intake' },
      });
      gtagFireLead(eventId);
      await supabase.from('marketing_leads').upsert(
        {
          email: values.email,
          country_code: values.country,
          source_url: typeof window !== 'undefined' ? window.location.href : null,
        } as never,
        { onConflict: 'email' }
      );
    } catch (err) {
      console.warn('[StepIntake] lead capture failed', err);
    }

    setSubmitting(false);
    onContinue(values as IntakeValues);
  };

  return (
    <SwipeableStep
      direction={direction}
      canAdvance={!!email && !!username && !!country && password.length >= 8}
      onSwipeNext={submit}
      onSwipeBack={onBack}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button
            type="button"
            onClick={() => { haptic(); onBack(); }}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
            Step 3 of 4
          </span>
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Claim your prize
          </h2>
          <p className="text-sm text-white/65">
            Create your account to unlock{' '}
            <span className="text-orange-400 font-semibold">{prizeLabel ?? 'your reward'}</span>
          </p>
        </div>

        {prizeLabel && (
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
            🔒 <span>Prize escrowed — finish below to claim.</span>
          </motion.div>
        )}

        <IconField icon={<Mail className="w-4 h-4" />}>
          <input
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
            disabled={submitting}
            className="w-full h-12 pl-11 pr-4 rounded-[14px] bg-black/40 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            style={{ border: '1px solid rgba(255,95,31,0.35)' }}
          />
        </IconField>

        <IconField icon={<User className="w-4 h-4" />}>
          <input
            type="text"
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); if (error) setError(null); }}
            disabled={submitting}
            maxLength={40}
            className="w-full h-12 pl-11 pr-4 rounded-[14px] bg-black/40 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            style={{ border: '1px solid rgba(255,95,31,0.35)' }}
          />
        </IconField>

        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400/70 pointer-events-none z-10" />
          <div
            className="rounded-[14px] overflow-hidden"
            style={{ border: '1px solid rgba(255,95,31,0.35)', background: 'rgba(0,0,0,0.4)' }}
          >
            <div className="[&_button]:!rounded-[14px] [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!h-12 [&_button]:!pl-11 [&_button]:!text-white [&_button:hover]:!bg-orange-500/10">
              <CountrySelector
                value={country}
                onChange={(c) => { setCountry(c); if (error) setError(null); }}
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        <IconField icon={<Lock className="w-4 h-4" />}>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Password (min 8)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
            disabled={submitting}
            className="w-full h-12 pl-11 pr-4 rounded-[14px] bg-black/40 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            style={{ border: '1px solid rgba(255,95,31,0.35)' }}
          />
        </IconField>

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
          Continue <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[10px] text-center text-white/40 px-2">
          By continuing you agree to our Terms & Privacy. No spam.
        </p>
      </form>
    </SwipeableStep>
  );
};

const IconField = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="relative">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400/70 pointer-events-none z-10">
      {icon}
    </span>
    {children}
  </div>
);
