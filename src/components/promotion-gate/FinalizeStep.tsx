import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';
import { CountrySelector } from '@/components/CountrySelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fbqTrack } from '@/lib/metaPixel';
import { getCountryFromUrl } from '@/lib/urlParams';

const profileSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
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
  onBack: () => void;
  onSkip: () => void;
}

const inputClass =
  'w-full h-11 px-4 rounded-[14px] border border-orange-500/40 bg-background/60 text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-colors';

export const FinalizeStep = ({
  email: prefilledEmail,
  role,
  prizeLabel,
  prizeData,
  onSubmitted,
  onBack,
  onSkip,
}: FinalizeStepProps) => {
  const [email, setEmail] = useState(prefilledEmail);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState<string | null>(getCountryFromUrl() ?? null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!country) {
      const fromUrl = getCountryFromUrl();
      if (fromUrl) setCountry(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passwordStrength =
    password.length >= 8 && /[0-9]/.test(password) ? 'strong' : password.length > 0 ? 'weak' : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = profileSchema.safeParse({
      email,
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
      // Persist prize so it auto-claims after email confirmation (tied to this email)
      try {
        localStorage.setItem(
          'pending_spin_prize',
          JSON.stringify({ ...prizeData, email: result.data.email, timestamp: Date.now() })
        );
      } catch {
        /* ignore */
      }

      const { error } = await supabase.auth.signUp({
        email: result.data.email,
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

      setEmailSent(true);
      // Fire CompleteRegistration (fan signup via promotion gate)
      void fbqTrack('CompleteRegistration', {
        email: result.data.email,
        country: result.data.country,
        user_type: role,
      });
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
            background: 'radial-gradient(circle, rgba(249,115,22,0.3), transparent 70%)',
            boxShadow: '0 0 40px rgba(249,115,22,0.5)',
          }}
        >
          <Mail className="w-10 h-10 text-orange-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
            Check Your Email
          </h2>
          <p className="text-sm text-white/70">
            We sent a confirmation link to
            <br />
            <span className="font-mono font-bold text-orange-400">{email}</span>
          </p>
        </div>
        <div className="px-4 py-3 rounded-[14px] border border-orange-500/40 bg-orange-500/10 text-sm text-orange-300">
          🔒 Your prize <span className="font-bold">{prizeLabel}</span> is locked in. Confirm your
          email to claim it.
        </div>
      </motion.div>
    );
  }

  // Social icons (visual only — wiring later)
  const SocialButton = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      disabled
      aria-label={`Continue with ${label} (coming soon)`}
      title="Coming soon"
      className="h-11 rounded-[14px] bg-white opacity-90 cursor-not-allowed flex items-center justify-center"
    >
      {children}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto px-6 space-y-5"
    >
      {/* Top bar: Back + Skip */}
      <div className="flex items-center justify-between -mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-white/60 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-white/60 hover:text-orange-400 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Header */}
      <div className="text-center space-y-1.5">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent leading-tight">
          CLAIM {prizeLabel}
        </h2>
        <p className="text-sm text-white/60">Create your account to lock it in.</p>
      </div>

      {/* Social row (visual only) */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <SocialButton label="Google">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </SocialButton>
          <SocialButton label="Apple">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="black">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          </SocialButton>
          <SocialButton label="Instagram">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <defs>
                <linearGradient id="ig-grad-fin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#feda75"/>
                  <stop offset="50%" stopColor="#d62976"/>
                  <stop offset="100%" stopColor="#4f5bd5"/>
                </linearGradient>
              </defs>
              <path fill="url(#ig-grad-fin)" d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.39C1.34 2.69.92 3.36.62 4.15.32 4.91.12 5.78.06 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.14.56 2.91.3.79.72 1.46 1.39 2.13.67.67 1.34 1.09 2.13 1.39.77.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.14-.26 2.91-.56.79-.3 1.46-.72 2.13-1.39.67-.67 1.09-1.34 1.39-2.13.3-.77.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.14-.56-2.91-.3-.79-.72-1.46-1.39-2.13C21.31 1.34 20.64.92 19.85.62c-.77-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 0 0 5.84 12 6.16 6.16 0 0 0 12 18.16 6.16 6.16 0 0 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/>
            </svg>
          </SocialButton>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-orange-500/20" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-background px-3 text-white/50">or continue with email</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Full Name">
          <input
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="John Doe"
          />
        </Field>

        <Field label="Username">
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className={inputClass}
            placeholder="johnny_d"
          />
        </Field>

        <Field label="Country">
          <div className="[&_button]:rounded-[14px] [&_button]:border-orange-500/40 [&_button]:bg-background/60 [&_button]:h-11">
            <CountrySelector
              value={country}
              onChange={setCountry}
              placeholder="Select your country"
            />
          </div>
        </Field>

        <Field label="Phone">
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
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
              className={`${inputClass} pr-11`}
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
              className={`text-[11px] mt-1 ${
                passwordStrength === 'strong' ? 'text-emerald-400' : 'text-orange-400'
              }`}
            >
              {passwordStrength === 'strong' ? '✓ Strong' : 'Needs 8+ chars and a number'}
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
            className={inputClass}
            placeholder="Re-enter password"
          />
        </Field>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          className="w-full h-12 rounded-[14px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Submitting…' : '⚡ CLAIM & CREATE ACCOUNT'}
        </motion.button>

        <p className="text-[11px] text-center text-white/40">
          You'll receive a confirmation email
        </p>
      </form>
    </motion.div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-white block">{label}</label>
    {children}
  </div>
);
