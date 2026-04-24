import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { ArrowRight, AlertCircle, Mail, Scissors, Heart, X } from 'lucide-react';
import { SwipeableStep } from './SwipeableStep';
import { useStepDirection } from './LaunchWizard';
import { supabase } from '@/integrations/supabase/client';
import { fbqTrack } from '@/lib/metaPixel';
import { gtagFireLead } from '@/lib/googleAds';
import type { LaunchRole } from './LaunchWizard';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, 'Email is too long')
  .email('Enter a valid email address');

interface StepEmailProps {
  initialEmail: string;
  onContinue: (email: string) => void;
  onSkip: () => void;
}

type SocialProvider = 'google' | 'apple' | 'facebook';
type SocialLabel = 'google' | 'apple' | 'instagram';

const haptic = () => {
  try { navigator.vibrate?.(10); } catch { /* ignore */ }
};

export const StepEmail = ({ initialEmail, onContinue, onSkip }: StepEmailProps) => {
  const direction = useStepDirection();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [socialPicker, setSocialPicker] = useState<{ provider: SocialProvider; label: SocialLabel } | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const validation = emailSchema.safeParse(email);
  const valid = validation.success;

  const submit = () => {
    setTouched(true);
    if (!valid) {
      setError(validation.error.errors[0].message);
      return;
    }
    haptic();
    onContinue(validation.data);
  };

  const openSocialPicker = (provider: SocialProvider, label: SocialLabel) => {
    haptic();
    setSocialPicker({ provider, label });
  };

  const handleRolePickAndOAuth = async (role: LaunchRole) => {
    if (!socialPicker) return;
    haptic();
    setSocialLoading(true);
    try {
      // Persist resume flags so Index re-mounts wizard at Spin step after OAuth roundtrip
      localStorage.setItem('pending_social_role', role);
      localStorage.setItem('wizard_resume_spin', 'true');
      localStorage.setItem('wizard_signup_method', socialPicker.label);

      // Fire Lead events with shared event_id
      const eventId = await fbqTrack('Lead', {
        signup_method: socialPicker.label,
        user_role: role,
      });
      gtagFireLead(eventId);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: socialPicker.provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          ...(socialPicker.provider === 'facebook'
            ? { scopes: 'email,public_profile' }
            : {}),
        },
      });
      if (error) {
        console.error('[OAuth]', error);
        setSocialLoading(false);
        setSocialPicker(null);
      }
      // Otherwise the browser is navigating away; do nothing
    } catch (e) {
      console.error('[OAuth] failed', e);
      setSocialLoading(false);
      setSocialPicker(null);
    }
  };

  return (
    <SwipeableStep
      direction={direction}
      canAdvance={valid}
      onSwipeNext={submit}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="space-y-5"
      >
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,140,0,0.35), transparent 70%)',
              border: '1px solid rgba(255,95,31,0.45)',
              boxShadow: '0 0 30px rgba(255,95,31,0.4)',
            }}
          >
            <Mail className="w-6 h-6 text-orange-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Reserve your seat
          </h2>
          <p className="text-xs text-white/60 max-w-xs mx-auto">
            One tap to join — no spam, just glory.
          </p>
        </div>

        {/* === Social row === */}
        <div className="flex items-center justify-center gap-4">
          <SocialIconButton label="Google" onClick={() => openSocialPicker('google', 'google')}>
            <GoogleGlyph />
          </SocialIconButton>
          <SocialIconButton label="Apple" onClick={() => openSocialPicker('apple', 'apple')}>
            <AppleGlyph />
          </SocialIconButton>
          <SocialIconButton label="Instagram" onClick={() => openSocialPicker('facebook', 'instagram')}>
            <InstagramGlyph />
          </SocialIconButton>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold">or use email</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>

        <div className="relative">
          <label
            htmlFor="ls-email"
            className={`absolute left-4 pointer-events-none transition-all duration-200 ${
              focused || email.length > 0
                ? 'top-1.5 text-[10px] uppercase tracking-wider text-orange-400 font-bold'
                : 'top-1/2 -translate-y-1/2 text-sm text-white/40'
            }`}
          >
            Email address
          </label>
          <input
            ref={inputRef}
            id="ls-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setEmail(e.target.value);
              if (touched) {
                const r = emailSchema.safeParse(e.target.value);
                setError(r.success ? null : r.error.errors[0].message);
              }
            }}
            onBlur={() => {
              setFocused(false);
              setTouched(true);
              const r = emailSchema.safeParse(email);
              setError(r.success ? null : r.error.errors[0].message);
            }}
            className="w-full h-14 px-4 pt-4 rounded-[14px] bg-black/40 text-white text-base font-medium focus:outline-none transition-all"
            style={{
              border: focused ? '1px solid rgb(255,95,31)' : '1px solid rgba(255,95,31,0.3)',
              boxShadow: focused ? '0 0 22px rgba(255,95,31,0.55), 0 0 0 2px rgba(255,95,31,0.2)' : 'none',
            }}
          />
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5 mt-2 px-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        <DualLayerButton type="submit" disabled={!valid && touched} onClick={submit}>
          Continue <ArrowRight className="w-4 h-4" />
        </DualLayerButton>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-white/40">🔒 No spam, promise.</span>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-white/50 hover:text-orange-400 transition-colors"
          >
            Skip
          </button>
        </div>
      </form>

      {/* === Inline mini "Pick your side" sheet (overlays the step) === */}
      <AnimatePresence>
        {socialPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center p-4 rounded-[20px]"
            style={{
              background: 'rgba(8,8,10,0.92)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="w-full max-w-sm space-y-5"
            >
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => !socialLoading && setSocialPicker(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-1.5">
                <h3 className="text-xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                  Pick your side first
                </h3>
                <p className="text-xs text-white/60">
                  Then continue with{' '}
                  <span className="text-orange-400 font-semibold capitalize">{socialPicker.label}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniRoleTile
                  icon={<Scissors className="w-6 h-6" />}
                  title="Barber"
                  desc="Compete & earn"
                  disabled={socialLoading}
                  onClick={() => handleRolePickAndOAuth('barber')}
                />
                <MiniRoleTile
                  icon={<Heart className="w-6 h-6" />}
                  title="Fan"
                  desc="Vote & support"
                  disabled={socialLoading}
                  onClick={() => handleRolePickAndOAuth('fan')}
                />
              </div>

              {socialLoading && (
                <p className="text-center text-xs text-white/60 animate-pulse">
                  Redirecting to {socialPicker.label}…
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SwipeableStep>
  );
};

/* ================== Sub-components ================== */

const SocialIconButton = ({
  children,
  label,
  onClick,
}: { children: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    type="button"
    aria-label={`Continue with ${label}`}
    onClick={onClick}
    className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-105"
    style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.18)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
    }}
  >
    {children}
  </button>
);

const MiniRoleTile = ({
  icon, title, desc, disabled, onClick,
}: {
  icon: React.ReactNode; title: string; desc: string; disabled?: boolean; onClick: () => void;
}) => (
  <motion.button
    type="button"
    disabled={disabled}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="relative h-32 rounded-[16px] flex flex-col items-center justify-center gap-2 disabled:opacity-50"
    style={{
      background: 'linear-gradient(160deg, rgba(255,95,31,0.14), rgba(255,140,0,0.05))',
      border: '1.5px solid rgba(255,95,31,0.5)',
      boxShadow: '0 0 18px rgba(255,95,31,0.25)',
    }}
  >
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #FF5F1F, #FFB347)',
        color: '#000',
        boxShadow: '0 0 14px rgba(255,95,31,0.55)',
      }}
    >
      {icon}
    </div>
    <div className="text-center">
      <div className="font-black uppercase tracking-wide text-white text-sm">{title}</div>
      <div className="text-[10px] text-white/55 mt-0.5">{desc}</div>
    </div>
  </motion.button>
);

const DualLayerButton = ({
  children,
  type = 'button',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    onPointerDown={() => haptic()}
    className="relative w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 overflow-hidden transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    style={{
      background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
      border: '1px solid rgba(255,255,255,0.3)',
      boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
    }}
  >
    {children}
  </button>
);

/* ================== Brand glyphs (inline SVG, no extra deps) ================== */

const GoogleGlyph = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.9 0 3.16.8 3.88 1.5l2.65-2.55C16.86 3.4 14.65 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12S6.76 21.5 12 21.5c6.9 0 9.5-4.85 9.5-7.36 0-.5-.05-.88-.12-1.24H12z"/>
  </svg>
);

const AppleGlyph = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden fill="white">
    <path d="M16.365 1.43c0 1.14-.42 2.22-1.18 3.04-.84.94-2.21 1.66-3.31 1.57-.13-1.12.43-2.27 1.13-3.02.79-.85 2.18-1.5 3.36-1.59zM20.5 17.39c-.61 1.4-.92 2.02-1.69 3.27-1.07 1.71-2.59 3.84-4.46 3.86-1.66.02-2.09-1.08-4.34-1.07-2.25.01-2.71 1.09-4.37 1.07-1.87-.02-3.31-1.95-4.39-3.66-3.01-4.79-3.33-10.41-1.47-13.4 1.32-2.13 3.4-3.38 5.36-3.38 1.99 0 3.24 1.09 4.89 1.09 1.6 0 2.57-1.09 4.87-1.09 1.74 0 3.59.95 4.91 2.59-4.32 2.36-3.62 8.5.69 10.72z"/>
  </svg>
);

const InstagramGlyph = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
    <defs>
      <linearGradient id="igGradWizard" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FED576" />
        <stop offset="26%" stopColor="#F47133" />
        <stop offset="61%" stopColor="#BC3081" />
        <stop offset="100%" stopColor="#4C63D2" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igGradWizard)"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.6"/>
    <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
  </svg>
);
