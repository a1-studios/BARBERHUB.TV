import { useState } from 'react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email');

interface ForgotPasswordFormProps {
  onBack?: () => void;
  initialEmail?: string;
}

export const ForgotPasswordForm = ({ onBack, initialEmail = '' }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 text-center py-2"
      >
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto"
          style={{
            background: 'radial-gradient(circle, rgba(0,240,255,0.3), transparent 70%)',
            boxShadow: '0 0 30px rgba(0,240,255,0.4)',
          }}
        >
          <CheckCircle2 className="w-7 h-7" style={{ color: '#00F0FF' }} />
        </div>
        <div>
          <h3 className="text-lg font-black uppercase tracking-wider text-white">Check your email</h3>
          <p className="text-sm text-white/60 mt-1">
            We sent a reset link to <span className="font-mono text-[#00F0FF]">{email}</span>
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs uppercase tracking-widest font-mono text-white/50 hover:text-white inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back to sign in
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center space-y-1">
        <h3 className="text-lg font-black uppercase tracking-wider text-white">Forgot Password?</h3>
        <p className="text-xs text-white/50 uppercase tracking-widest font-mono">
          We'll send you a reset link
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="forgot-email"
          className="text-[10px] uppercase tracking-[0.3em] font-bold block"
          style={{ color: '#00F0FF' }}
        >
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cyber-input pl-10"
            placeholder="you@domain.com"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 font-black tracking-[0.2em] uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #FF5F00, #FF8C00)',
          color: '#000',
          boxShadow: '0 0 24px rgba(255,95,0,0.4)',
          borderRadius: '2px',
        }}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Send Reset Link
      </button>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full text-xs uppercase tracking-widest font-mono text-white/50 hover:text-white inline-flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back to sign in
        </button>
      )}
    </motion.form>
  );
};
