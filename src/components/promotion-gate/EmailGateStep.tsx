import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Mail, ArrowRight, ShieldAlert } from 'lucide-react';

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
    // Block obvious test patterns
    const local = val.split('@')[0];
    return !/^(test|asdf|qwerty|abc|xyz)\d*$/.test(local);
  }, 'Please use a real email address');

interface EmailGateStepProps {
  initialEmail?: string;
  onContinue: (email: string) => void;
}

export const EmailGateStep = ({ initialEmail = '', onContinue }: EmailGateStepProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
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
      return;
    }
    onContinue(validation.data);
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="w-full max-w-md mx-auto px-6 space-y-8"
    >
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 600, damping: 20 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2"
          style={{
            borderColor: '#00F0FF',
            background: 'radial-gradient(circle at center, rgba(0,240,255,0.15), transparent 70%)',
            boxShadow: '0 0 30px rgba(0,240,255,0.4), inset 0 0 20px rgba(0,0,0,0.6)',
          }}
        >
          <Mail className="w-7 h-7" style={{ color: '#00F0FF' }} />
        </motion.div>
        <h2
          className="text-2xl md:text-3xl font-black tracking-[0.2em] uppercase"
          style={{ color: '#fff', textShadow: '0 0 12px rgba(0,240,255,0.5)' }}
        >
          Enter the Vault
        </h2>
        <p className="text-xs uppercase tracking-widest" style={{ color: '#7a8a8d' }}>
          Identification required
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="gate-email"
          className="text-[10px] uppercase tracking-[0.3em] font-bold block"
          style={{ color: '#00F0FF' }}
        >
          ◢ Operator Email
        </label>
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
          className="w-full bg-black border-2 px-4 py-4 text-white text-base font-mono placeholder:text-white/20 focus:outline-none transition-all"
          style={{
            borderColor: error ? '#ff3344' : isValid ? '#00F0FF' : 'rgba(0,240,255,0.25)',
            boxShadow: error
              ? '0 0 20px rgba(255,51,68,0.3), inset 0 0 14px rgba(0,0,0,0.8)'
              : isValid
              ? '0 0 20px rgba(0,240,255,0.4), inset 0 0 14px rgba(0,0,0,0.8)'
              : 'inset 0 0 14px rgba(0,0,0,0.8)',
            borderRadius: '2px',
          }}
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs flex items-center gap-1.5 font-mono"
            style={{ color: '#ff5566' }}
          >
            <ShieldAlert className="w-3 h-3" />
            {error}
          </motion.p>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={!isValid}
        whileHover={isValid ? { scale: 1.02 } : {}}
        whileTap={isValid ? { scale: 0.98 } : {}}
        transition={{ type: 'spring', stiffness: 800, damping: 30 }}
        className="w-full py-4 font-black tracking-[0.25em] uppercase text-sm flex items-center justify-center gap-3 transition-all disabled:cursor-not-allowed"
        style={{
          background: isValid
            ? 'linear-gradient(135deg, #FF5F00, #FF8C00)'
            : 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
          color: isValid ? '#000' : '#555',
          boxShadow: isValid
            ? '0 0 30px rgba(255,95,0,0.5), inset 0 0 20px rgba(0,0,0,0.2)'
            : 'inset 0 0 20px rgba(0,0,0,0.6)',
          borderRadius: '2px',
          border: isValid ? '1px solid rgba(255,140,0,0.6)' : '1px solid rgba(255,255,255,0.05)',
        }}
      >
        Authenticate
        <ArrowRight className="w-4 h-4" />
      </motion.button>

      <p className="text-[10px] text-center uppercase tracking-widest font-mono" style={{ color: '#5a6a6d' }}>
        ◣ Encrypted · Single-use · No spam
      </p>
    </motion.form>
  );
};
