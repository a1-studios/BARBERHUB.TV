import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { ArrowRight, AlertCircle, Mail } from 'lucide-react';

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

export const StepEmail = ({ initialEmail, onContinue, onSkip }: StepEmailProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validation = emailSchema.safeParse(email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }
    onContinue(validation.data);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-2 bg-orange-500/15 border border-orange-500/40">
          <Mail className="w-6 h-6 text-orange-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          Reserve your seat
        </h2>
        <p className="text-sm text-white/60">
          Drop your email — we'll save your spot in the arena.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ls-email" className="text-sm font-medium text-white block">
          Email
        </label>
        <input
          ref={inputRef}
          id="ls-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (touched) {
              const r = emailSchema.safeParse(e.target.value);
              setError(r.success ? null : r.error.errors[0].message);
            }
          }}
          onBlur={() => {
            setTouched(true);
            const r = emailSchema.safeParse(email);
            setError(r.success ? null : r.error.errors[0].message);
          }}
          className="w-full h-11 px-4 rounded-[14px] border border-orange-500/40 bg-background/60 text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-colors"
        />
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>

      <motion.button
        type="submit"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full h-12 rounded-[14px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </motion.button>

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
    </motion.form>
  );
};
