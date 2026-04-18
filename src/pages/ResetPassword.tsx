import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72)
  .regex(/[0-9]/, 'Password must contain at least one number');

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase puts the recovery session in the URL hash; the SDK handles it.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    // If the hash is already processed by the time we mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // If hash explicitly has type=recovery but no session yet, wait briefly
    const hash = window.location.hash;
    if (!hash.includes('type=recovery') && !hash.includes('access_token')) {
      // No recovery context present
      setError('This page must be opened from a password reset email link.');
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated. You are signed in.');
    navigate('/', { replace: true });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(circle at center, #0a0a0a, #050505), repeating-linear-gradient(0deg, transparent 0 1px, rgba(255,255,255,0.02) 1px 2px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 border-2 space-y-6"
        style={{
          borderColor: 'rgba(0,240,255,0.4)',
          background: 'rgba(0,0,0,0.7)',
          boxShadow: '0 0 40px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,0,0,0.8)',
          borderRadius: '4px',
        }}
      >
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,240,255,0.2), transparent 70%)',
              boxShadow: '0 0 30px rgba(0,240,255,0.4)',
            }}
          >
            <ShieldCheck className="w-8 h-8" style={{ color: '#00F0FF' }} />
          </div>
          <h1
            className="text-2xl font-black tracking-[0.2em] uppercase"
            style={{ color: '#fff', textShadow: '0 0 12px rgba(0,240,255,0.5)' }}
          >
            Reset Password
          </h1>
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#7a8a8d' }}>
            Choose a new secure password
          </p>
        </div>

        {error ? (
          <div
            className="px-4 py-3 text-sm text-center"
            style={{
              color: '#ff5566',
              background: 'rgba(255,51,68,0.08)',
              border: '1px solid rgba(255,51,68,0.3)',
              borderRadius: '2px',
            }}
          >
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                className="text-[10px] uppercase tracking-[0.3em] font-bold block"
                style={{ color: '#00F0FF' }}
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!ready}
                  className="cyber-input pl-10 pr-11"
                  placeholder="Min 8 chars · 1 number"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-[10px] uppercase tracking-[0.3em] font-bold block"
                style={{ color: '#00F0FF' }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={!ready}
                  className="cyber-input pl-10"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !ready}
              className="w-full py-3 font-black tracking-[0.25em] uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #FF5F00, #FF8C00)',
                color: '#000',
                boxShadow: '0 0 30px rgba(255,95,0,0.5)',
                borderRadius: '2px',
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>

            {!ready && !error && (
              <p className="text-[10px] text-center uppercase tracking-widest font-mono" style={{ color: '#7a8a8d' }}>
                ◢ Verifying recovery link…
              </p>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
}
