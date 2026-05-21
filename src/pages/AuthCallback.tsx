import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Loader2, Mail, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { authCallbackRedirect } from '@/lib/authRedirects';
import { toast } from 'sonner';

type Status = 'verifying' | 'success' | 'error';

const getPendingEmail = (): string => {
  try {
    const raw = localStorage.getItem('raffle_pending_claim');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return typeof parsed?.email === 'string' ? parsed.email : '';
  } catch {
    return '';
  }
};

/**
 * Handles signup confirmation, magic links, and email change confirmations.
 * Supports three Supabase delivery modes:
 *   1. Hash tokens (#access_token=...)  — SDK auto-parses
 *   2. PKCE code (?code=...)            — we call exchangeCodeForSession
 *   3. 6-digit OTP from the email       — manual entry form fallback
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otpEmail, setOtpEmail] = useState(() => getPendingEmail());
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    let settled = false;

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const combined = hash + search;

    // Explicit error returned by Supabase
    if (combined.includes('error=') || combined.includes('error_code=')) {
      const params = new URLSearchParams(hash.replace(/^#/, '') || search.replace(/^\?/, ''));
      const desc =
        params.get('error_description') ||
        params.get('error') ||
        'This confirmation link is invalid or has expired.';
      setErrorMsg(decodeURIComponent(desc.replace(/\+/g, ' ')));
      setStatus('error');
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

    // PKCE: Supabase redirects with ?code=... — exchange it for a session.
    const searchParams = new URLSearchParams(search);
    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (settled) return;
        if (error) {
          settled = true;
          setErrorMsg(error.message || 'We could not verify this link. It may have expired or already been used.');
          setStatus('error');
        }
        // success path handled by onAuthStateChange
      });
    } else {
      // Fallback: SDK may already have a session (hash-parsed)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (settled) return;
        if (session) {
          settled = true;
          setStatus('success');
          setTimeout(() => navigate('/', { replace: true }), 1200);
        }
      });
    }

    // Hard timeout — give exchange time, then offer manual options
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      setErrorMsg('We could not verify this link automatically. Enter the 6-digit code from your email, or request a new link.');
      setStatus('error');
    }, 10000);

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
        emailRedirectTo: authCallbackRedirect(),
      },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Confirmation email sent. Check your inbox (and spam folder).');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = otpEmail.trim().toLowerCase();
    const token = otpCode.trim();
    if (!email || token.length < 6) {
      toast.error('Enter your email and the 6-digit code');
      return;
    }
    setVerifyingOtp(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setVerifyingOtp(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // onAuthStateChange('SIGNED_IN') will route us home
    setStatus('success');
    setTimeout(() => navigate('/', { replace: true }), 1000);
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
          <div className="space-y-5">
            <div className="text-center space-y-4 py-4">
              <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#FF5F1F' }} />
              <h1 className="text-xl font-black uppercase tracking-[0.2em] text-white">
                Verifying…
              </h1>
              <p className="text-xs uppercase tracking-widest font-mono" style={{ color: '#7a8a8d' }}>
                Confirming your account
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOtpForm((v) => !v)}
              className="w-full text-[10px] uppercase tracking-widest font-mono text-white/60 hover:text-white pt-1"
            >
              {showOtpForm ? '← Hide code entry' : 'Have a 6-digit code? Enter it →'}
            </button>
            {showOtpForm && (
              <OtpForm
                email={otpEmail}
                setEmail={setOtpEmail}
                code={otpCode}
                setCode={setOtpCode}
                onSubmit={handleVerifyOtp}
                busy={verifyingOtp}
              />
            )}
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
                Verify Manually
              </h1>
              <p className="text-sm" style={{ color: '#b8b8b8' }}>
                {errorMsg}
              </p>
            </div>

            <OtpForm
              email={otpEmail}
              setEmail={setOtpEmail}
              code={otpCode}
              setCode={setOtpCode}
              onSubmit={handleVerifyOtp}
              busy={verifyingOtp}
            />

            <form onSubmit={handleResend} className="space-y-3 pt-4 border-t border-white/10">
              <label
                className="text-[10px] uppercase tracking-[0.3em] font-bold block"
                style={{ color: '#FF5F1F' }}
              >
                Or resend confirmation email
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

interface OtpFormProps {
  email: string;
  setEmail: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
}

function OtpForm({ email, setEmail, code, setCode, onSubmit, busy }: OtpFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label
        className="text-[10px] uppercase tracking-[0.3em] font-bold block"
        style={{ color: '#FF5F1F' }}
      >
        Enter code from email
      </label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="cyber-input pl-10"
        />
      </div>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          className="cyber-input pl-10 font-mono tracking-[0.5em] text-center"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 font-black tracking-[0.2em] uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg, #FF5F1F, #FF8C00)',
          color: '#000',
          boxShadow: '0 0 24px rgba(255,95,31,0.4)',
          borderRadius: '2px',
        }}
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Verify Code
      </button>
    </form>
  );
}
