import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { ArrowRight, Mail, AlertCircle, Loader2, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { authCallbackRedirect } from '@/lib/authRedirects';
import type { LaunchRole, BarberStatus } from './LaunchWizard';

const schema = z.object({
  email: z.string().trim().toLowerCase().max(255).email('Enter a valid email'),
});

interface Props {
  initialEmail: string;
  role: LaunchRole;
  barberStatus: BarberStatus | null;
  country: string | null;
  phone: string;
  vipCode: string;
  onContinue: (email: string) => void;
  onBack: () => void;
}

const haptic = () => { try { navigator.vibrate?.(10); } catch { /* */ } };

const persistPending = (data: {
  role: LaunchRole; barberStatus: BarberStatus | null; country: string | null; phone: string; email: string; vipCode: string;
}) => {
  try { sessionStorage.setItem('bh_pending_role', JSON.stringify(data)); } catch { /* */ }
};

export const StepAuth = ({ initialEmail, role, barberStatus, country, phone, vipCode, onContinue, onBack }: Props) => {
  const direction = useStepDirection();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEmail, setShowEmail] = useState(!!initialEmail);
  const [emailSent, setEmailSent] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showEmail && !emailSent) {
      const t = setTimeout(() => ref.current?.focus(), 320);
      return () => clearTimeout(t);
    }
  }, [showEmail, emailSent]);

  const oauth = async (provider: 'google' | 'apple' | 'facebook') => {
    haptic();
    persistPending({ role, barberStatus, country, phone, email });
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authCallbackRedirect(),
        queryParams: { prompt: 'select_account' },
      },
    });
  };

  const sendEmail = async () => {
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    setError(null);
    haptic();
    const lower = parsed.data.email;
    persistPending({ role, barberStatus, country, phone, email: lower });

    try {
      // Register lead (idempotent — soft 200 on duplicates)
      await supabase.functions.invoke('register-lead', {
        body: {
          email: lower,
          fingerprint: getDeviceFingerprint(),
          source_url: typeof window !== 'undefined' ? window.location.href : undefined,
          country_code: country,
          phone_number: phone || null,
        },
      });

      // Persist role server-side so claim-raffle-ticket gates open
      await supabase.functions.invoke('submit-role-details', {
        body: {
          email: lower,
          role,
          country_code: country,
          phone_number: phone || null,
          ...(role === 'barber' ? { barber_status: barberStatus ?? 'beginner' } : {}),
        },
      });

      // Magic link — bundles role into user_metadata so handle_new_user picks it up
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: lower,
        options: {
          emailRedirectTo: authCallbackRedirect(),
          data: {
            user_type: role,
            display_name: lower.split('@')[0],
            country_code: country,
            barber_status: role === 'barber' ? (barberStatus ?? 'beginner') : null,
            phone_number: phone || null,
            tos_accepted_at: new Date().toISOString(),
          },
        },
      });
      if (otpErr) {
        setError(otpErr.message);
        setSubmitting(false);
        return;
      }
      setEmailSent(true);
      setSubmitting(false);
      onContinue(lower);
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  };

  return (
    <SwipeableStep direction={direction} canAdvance={!!email && !submitting} onSwipeNext={sendEmail} onSwipeBack={onBack}>
      <div className="space-y-5">
        <div className="flex items-center justify-between -mt-1 min-h-[20px]">
          <button type="button" onClick={() => { haptic(); onBack(); }} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
            Step 2 · {role === 'barber' ? 'Barber' : 'Fan'} sign-in
          </span>
        </div>

        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="text-5xl mb-1"
          >
            🍀
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Save your seat
          </h2>
          <p className="text-sm text-white/70 px-4">
            One tap and you're in.<br/>
            <span className="text-orange-300/90 font-semibold">15 Barber Bucks waiting on the other side.</span>
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-4">
            <SocialCircle provider="google" onClick={() => oauth('google')} label="Google" />
            <SocialCircle provider="apple" onClick={() => oauth('apple')} label="Apple" />
            <SocialCircle provider="facebook" onClick={() => oauth('facebook')} label="Meta" />
          </div>
          <p className="text-[10px] text-center text-white/45 uppercase tracking-wider font-bold">
            1-tap entry · no password
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">or use email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {emailSent ? (
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ color: '#00F0FF', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.3)' }}>
              <Check className="w-3.5 h-3.5" /> Magic link sent
            </div>
            <p className="text-xs text-white/65">
              Open <span className="font-mono font-bold text-orange-400">{email}</span> and tap the link to unlock your bonus.
            </p>
          </div>
        ) : !showEmail ? (
          <button
            type="button"
            onClick={() => { haptic(); setShowEmail(true); }}
            className="w-full h-11 rounded-[14px] text-xs font-bold uppercase tracking-wider text-white/85 flex items-center justify-center gap-2 transition-transform active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <Mail className="w-3.5 h-3.5" /> Enter email instead
          </button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); sendEmail(); }} className="space-y-3">
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
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <>Send magic link <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        <p className="text-[10px] text-center text-white/40 px-2">
          By continuing you accept our Terms, Privacy Policy & AUP.
        </p>
      </div>
    </SwipeableStep>
  );
};

const SocialCircle = ({
  provider, onClick, label,
}: { provider: 'google' | 'apple' | 'facebook'; onClick: () => void; label: string }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileTap={{ scale: 0.9 }}
    whileHover={{ scale: 1.05 }}
    aria-label={`Continue with ${label}`}
    className="relative w-16 h-16 rounded-full flex items-center justify-center text-white"
    style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1.5px solid rgba(255,95,31,0.4)',
      boxShadow: '0 6px 20px rgba(255,95,31,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
    }}
  >
    {provider === 'google' && (
      <svg className="w-7 h-7" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
      </svg>
    )}
    {provider === 'apple' && (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    )}
    {provider === 'facebook' && (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )}
  </motion.button>
);

// Back-compat default export so any old imports still resolve
export const StepIdentityHook = StepAuth;
