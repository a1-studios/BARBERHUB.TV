import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Sparkles, ArrowRight, AlertCircle, LogIn } from 'lucide-react';
import { fbqTrack } from '@/lib/metaPixel';
import { readStoredCountry } from '@/lib/urlParams';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'tempmail.net',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'getnada.com',
  'maildrop.cc',
  'dispostable.com',
  'test.com',
  'example.com',
  'example.org',
]);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, 'Email is too long')
  .email('Enter a valid email address')
  .refine((val) => {
    const domain = val.split('@')[1];
    return domain && !DISPOSABLE_DOMAINS.has(domain);
  }, 'Disposable email addresses are not allowed')
  .refine((val) => {
    const local = val.split('@')[0];
    return !/^(test|asdf|qwerty|abc|xyz)\d*$/.test(local);
  }, 'Please use a real email address');

interface EmailGateStepProps {
  initialEmail?: string;
  onContinue: (email: string) => void;
  onSignIn?: () => void;
}

export const EmailGateStep = ({ initialEmail = '', onContinue, onSignIn }: EmailGateStepProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validation = emailSchema.safeParse(email);
  const isValid = validation.success;

  const handleChange = (val: string) => {
    setEmail(val);
    if (touched) {
      const result = emailSchema.safeParse(val);
      setError(result.success ? null : result.error.errors[0].message);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const result = emailSchema.safeParse(email);
    setError(result.success ? null : result.error.errors[0].message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) {
      setError(validation.error?.errors[0].message || 'Invalid email');
      setShake((s) => s + 1);
      return;
    }
    // Fire Meta Lead event (pixel + CAPI)
    void fbqTrack('Lead', {
      email: validation.data,
      country: readStoredCountry(),
    });
    onContinue(validation.data);
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="w-full max-w-md mx-auto px-6 space-y-7"
    >
      {/* Icon w/ orange pulsing ring + particle burst */}
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Particle burst */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0.9, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0.9, 0.7, 0],
                x: Math.cos((i / 6) * Math.PI * 2) * 56,
                y: Math.sin((i / 6) * Math.PI * 2) * 56,
              }}
              transition={{
                duration: 1.6,
                delay: 0.15 + i * 0.05,
                repeat: Infinity,
                repeatDelay: 1.4,
                ease: 'easeOut',
              }}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ background: '#FF8C00', boxShadow: '0 0 8px #FF5F1F' }}
            />
          ))}

          {/* Outer pulsing orange halo */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,95,31,0.45), rgba(255,95,31,0) 70%)',
              filter: 'blur(4px)',
            }}
          />

          {/* Solid orange ring with cyan inner accent */}
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
              boxShadow:
                '0 0 28px rgba(255,95,31,0.7), inset 0 0 10px rgba(0,0,0,0.4), inset 0 0 0 1.5px rgba(0,240,255,0.4)',
            }}
          >
            <Sparkles className="w-7 h-7 text-black" strokeWidth={2.5} />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl md:text-4xl font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(135deg, #FFB347 0%, #FF8C00 40%, #FF5F1F 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 12px rgba(255,95,31,0.35))',
            }}
          >
            Welcome to the Arena ⚡
          </motion.h2>
          <p className="text-sm text-white/70 font-medium">
            Your seat at the table is one tap away.
          </p>
        </div>
      </div>

      {/* Email field */}
      <motion.div
        key={shake}
        animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <label
          htmlFor="gate-email"
          className="text-xs font-semibold flex items-center gap-1.5 text-white/80"
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: '#FF5F1F', boxShadow: '0 0 6px #FF5F1F' }}
          />
          Email
        </label>
        <div className="relative">
          {/* Focused orange glow */}
          {isValid && (
            <div
              className="absolute -inset-px rounded-xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255,95,31,0.25), transparent 70%)',
              }}
            />
          )}
          <input
            ref={inputRef}
            id="gate-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="relative w-full bg-black/80 border-2 px-4 py-4 text-white text-base placeholder:text-white/25 focus:outline-none transition-all rounded-xl"
            style={{
              borderColor: error
                ? '#ff3344'
                : isValid
                ? '#FF5F1F'
                : 'rgba(255,255,255,0.12)',
              boxShadow: error
                ? '0 0 18px rgba(255,51,68,0.3)'
                : isValid
                ? '0 0 22px rgba(255,95,31,0.45), inset 0 0 0 1px rgba(0,240,255,0.25)'
                : 'inset 0 0 12px rgba(0,0,0,0.6)',
            }}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs flex items-center gap-1.5"
            style={{ color: '#ff5566' }}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Primary CTA — always live orange */}
      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 800, damping: 30 }}
        className="relative w-full py-4 font-black tracking-wide text-base flex items-center justify-center gap-2 overflow-hidden rounded-xl text-black"
        style={{
          background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
          boxShadow:
            '0 8px 28px rgba(255,95,31,0.55), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {/* Shimmer sweep */}
        <motion.span
          aria-hidden
          className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
            transform: 'skewX(-20deg)',
          }}
          animate={{ x: ['0%', '450%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
        />
        <span className="relative">Continue</span>
        <ArrowRight className="relative w-5 h-5" strokeWidth={3} />
      </motion.button>

      {/* Sign-in branch */}
      {onSignIn && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">or</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:bg-[rgba(0,240,255,0.08)]"
            style={{
              border: '1px solid rgba(0,240,255,0.4)',
              color: '#7FE7FF',
              boxShadow: 'inset 0 0 0 1px rgba(0,240,255,0.05)',
            }}
          >
            <LogIn className="w-4 h-4" />
            Already have an account? <span className="underline underline-offset-2">Sign in</span>
          </button>
        </div>
      )}

      <p className="text-[11px] text-center text-white/40">
        🔒 We never spam. Promise.
      </p>
    </motion.form>
  );
};
