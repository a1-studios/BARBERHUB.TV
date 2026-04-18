import { useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username too long')
    .regex(/^[a-z0-9_]+$/, 'Letters, numbers and underscore only'),
  country: z.string().min(2, 'Select a country'),
  phone: z.string().trim().min(6, 'Enter a valid phone number').max(24),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

interface FinalizeStepProps {
  email: string;
  role: 'barber' | 'fan';
  prizeLabel: string;
  prizeData: {
    prize_id: string | null;
    prize_label: string | null;
    prize_bb: number;
    prize_type: string | null;
    duration_months: number;
    role: 'barber' | 'fan';
  };
  onSubmitted: () => void;
}

export const FinalizeStep = ({
  email,
  role,
  prizeLabel,
  prizeData,
  onSubmitted,
}: FinalizeStepProps) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const passwordStrength =
    password.length >= 8 && /[0-9]/.test(password) ? 'strong' : password.length > 0 ? 'weak' : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = profileSchema.safeParse({
      fullName,
      username,
      country: country || '',
      phone,
      password,
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Persist prize so it auto-claims after email confirmation
      try {
        localStorage.setItem(
          'pending_spin_prize',
          JSON.stringify({ ...prizeData, timestamp: Date.now() })
        );
      } catch {
        /* ignore */
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: result.data.fullName,
            full_name: result.data.fullName,
            username: result.data.username,
            user_type: role,
            country_code: result.data.country,
            phone_number: result.data.phone,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          toast.error('This email is already registered. Try signing in instead.');
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }

      // Mark gate completed and notify parent (which will show success screen)
      setEmailSent(true);
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto px-6 space-y-6 text-center"
      >
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mx-auto"
          style={{
            background: 'radial-gradient(circle, rgba(0,240,255,0.3), transparent 70%)',
            boxShadow: '0 0 40px rgba(0,240,255,0.5)',
          }}
        >
          <Mail className="w-10 h-10" style={{ color: '#00F0FF' }} />
        </div>
        <div className="space-y-2">
          <h2
            className="text-2xl font-black tracking-[0.15em] uppercase"
            style={{ color: '#fff', textShadow: '0 0 12px rgba(0,240,255,0.5)' }}
          >
            Check Your Email
          </h2>
          <p className="text-sm" style={{ color: '#a0b0b3' }}>
            We sent a confirmation link to
            <br />
            <span className="font-mono font-bold" style={{ color: '#00F0FF' }}>
              {email}
            </span>
          </p>
        </div>
        <div
          className="px-4 py-3 border text-xs"
          style={{
            borderColor: 'rgba(255,95,0,0.4)',
            background: 'rgba(255,95,0,0.08)',
            color: '#FF8C00',
            borderRadius: '2px',
          }}
        >
          🔒 Your prize <span className="font-bold">{prizeLabel}</span> is locked in. Confirm your
          email to claim it.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto px-6 space-y-5"
    >
      <div className="text-center space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.3em] font-mono" style={{ color: '#FF8C00' }}>
          ◢ Final step · Claim {prizeLabel}
        </p>
        <h2
          className="text-2xl md:text-3xl font-black tracking-[0.15em] uppercase"
          style={{ color: '#fff', textShadow: '0 0 12px rgba(0,240,255,0.4)' }}
        >
          Create Account
        </h2>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: '#00F0FF' }}>
          Email
        </label>
        <div
          className="px-4 py-3 font-mono text-sm flex items-center justify-between"
          style={{
            background: 'rgba(0,240,255,0.06)',
            border: '1px solid rgba(0,240,255,0.3)',
            color: '#00F0FF',
            borderRadius: '2px',
          }}
        >
          <span className="truncate">{email}</span>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        </div>
      </div>

      <Field label="Full Name">
        <input
          type="text"
          autoComplete="name"
          inputMode="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="cyber-input"
          placeholder="John Doe"
        />
      </Field>

      <Field label="Username">
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          inputMode="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          className="cyber-input"
          placeholder="johnny_d"
        />
      </Field>

      <Field label="Country">
        <CountrySelector
          value={country}
          onChange={setCountry}
          placeholder="Select your country"
        />
      </Field>

      <Field label="Phone">
        <input
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="cyber-input"
          placeholder="+1 555 0100"
        />
      </Field>

      <Field label="Password">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="cyber-input pr-11"
            placeholder="Min 8 chars · 1 number"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {passwordStrength && (
          <p
            className="text-[10px] uppercase tracking-widest font-mono mt-1"
            style={{ color: passwordStrength === 'strong' ? '#00F0FF' : '#FF8C00' }}
          >
            {passwordStrength === 'strong' ? '◢ Strong' : '◢ Needs 8+ chars and a number'}
          </p>
        )}
      </Field>

      <Field label="Confirm Password">
        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="cyber-input"
          placeholder="Re-enter password"
        />
      </Field>

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={!loading ? { scale: 1.02 } : {}}
        whileTap={!loading ? { scale: 0.98 } : {}}
        className="w-full py-4 font-black tracking-[0.25em] uppercase text-sm flex items-center justify-center gap-3 disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #FF5F00, #FF8C00)',
          color: '#000',
          boxShadow: '0 0 30px rgba(255,95,0,0.5)',
          borderRadius: '2px',
          border: '1px solid rgba(255,140,0,0.6)',
        }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Submitting…' : 'Claim & Create Account'}
      </motion.button>

      <p className="text-[10px] text-center uppercase tracking-widest font-mono" style={{ color: '#5a6a6d' }}>
        ◣ You'll receive a confirmation email
      </p>
    </motion.form>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] uppercase tracking-[0.3em] font-bold block" style={{ color: '#00F0FF' }}>
      {label}
    </label>
    {children}
  </div>
);
