import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Status = 'verifying' | 'success' | 'error';

/**
 * Handles the auth callback hash for signup confirmation, magic links,
 * and email change confirmations. The Supabase JS SDK auto-parses the
 * URL hash on load and fires onAuthStateChange('SIGNED_IN'). We just
 * watch for that, then route the user into the app.
 *
 * On error (expired/invalid token), surfaces a "Resend confirmation"
 * button so the user is never stuck.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let settled = false;

    // Check the URL hash for an explicit error (Supabase appends ?error=...
    // or #error=... when a token is invalid/expired).
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const combined = hash + search;

    if (combined.includes('error=') || combined.includes('error_code=')) {
      const params = new URLSearchParams(hash.replace(/^#/, '') || search.replace(/^\?/, ''));
      const desc =
        params.get('error_description') ||
        params.get('error') ||
        'This confirmation link is invalid or has expired.';
      setErrorMsg(decodeURIComponent(desc.replace(/\+/g, ' ')));
      setStatus('error');
      settled = true;
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (event === 'SIGNED_IN' && session) {
        settled = true;
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1200);
      }
    });

    // Fallback: if the SDK already had a session before we mounted
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      if (session) {
        settled = true;
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1200);
      }
    });

    // Hard timeout — if nothing has happened in 6s, treat as error
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      setErrorMsg('We could not verify this link. It may have expired or already been used.');
      setStatus('error');
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.error('Enter your email');
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: resendEmail.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Confirmation email sent. Check your inbox (and spam folder).');
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
          borderColor: 'rgba(255,95,31,0.4)',
          background: 'rgba(0,0,0,0.7)',
          boxShadow: '0 0 40px rgba(255,95,31,0.15), inset 0 0 20px rgba(0,0,0,0.8)',
          borderRadius: '4px',
        }}
      >
        {status === 'verifying' && (
          <div className="text-center space-y-4 py-4">
            <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#FF5F1F' }} />
            <h1 className="text-xl font-black uppercase tracking-[0.2em] text-white">
              Verifying…
            </h1>
            <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#7a8a8d' }}>
              Confirming your account
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4 py-4">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34,197,94,0.25), transparent 70%)',
                boxShadow: '0 0 30px rgba(34,197,94,0.4)',
              }}
            >
              <CheckCircle2 className="w-9 h-9" style={{ color: '#22c55e' }} />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-white">
              Account Confirmed
            </h1>
            <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#7a8a8d' }}>
              Welcome to BarberHub. Redirecting…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-5">
            <div className="text-center space-y-3">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto"
                style={{
                  background: 'radial-gradient(circle, rgba(255,95,31,0.25), transparent 70%)',
                  boxShadow: '0 0 30px rgba(255,95,31,0.4)',
                }}
              >
                <AlertTriangle className="w-9 h-9" style={{ color: '#FF5F1F' }} />
              </div>
              <h1 className="text-xl font-black uppercase tracking-[0.18em] text-white">
                Link Expired
              </h1>
              <p className="text-sm" style={{ color: '#b8b8b8' }}>
                {errorMsg}
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-3 pt-2 border-t border-white/10">
              <label
                className="text-[10px] uppercase tracking-[0.3em] font-bold block"
                style={{ color: '#FF5F1F' }}
              >
                Resend confirmation email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="cyber-input pl-10"
                />
              </div>
              <button
                type="submit"
                disabled={resending}
                className="w-full py-3 font-black tracking-[0.2em] uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
                  color: '#000',
                  boxShadow: '0 0 24px rgba(255,95,31,0.4)',
                  borderRadius: '2px',
                }}
              >
                {resending && <Loader2 className="w-4 h-4 animate-spin" />}
                Send New Link
              </button>
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="w-full text-[10px] uppercase tracking-widest font-mono text-white/50 hover:text-white pt-1"
              >
                ← Back to home
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
