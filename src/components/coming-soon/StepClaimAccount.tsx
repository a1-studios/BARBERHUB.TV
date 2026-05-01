import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { authCallbackRedirect } from '@/lib/authRedirects';
import { markGateCompleted } from '@/components/promotion-gate/useGateState';

interface Props {
  email: string;
  role: 'barber' | 'fan';
  country: string | null;
  ticketCode: string;
  bbAwarded: number;
  onClose: () => void;
}

const haptic = (ms = 15) => { try { navigator.vibrate?.(ms); } catch { /* */ } };

export const StepClaimAccount = ({ email, role, country, ticketCode, bbAwarded, onClose }: Props) => {
  const [busy, setBusy] = useState<'google' | 'apple' | 'facebook' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const oauth = async (provider: 'google' | 'apple' | 'facebook') => {
    setBusy(provider);
    setError(null);
    haptic();
    // Stash claim metadata so the callback function can credit the ticket
    try {
      localStorage.setItem('raffle_pending_claim', JSON.stringify({ email, role, country, ticketCode, bbAwarded }));
    } catch { /* ignore */ }

    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authCallbackRedirect(),
        queryParams: { prompt: 'select_account' },
      },
    });
    if (authErr) {
      setError(authErr.message);
      setBusy(null);
    }
  };

  const emailMagicLink = async () => {
    setBusy('email');
    setError(null);
    haptic();
    try {
      localStorage.setItem('raffle_pending_claim', JSON.stringify({ email, role, country, ticketCode, bbAwarded }));
    } catch { /* ignore */ }

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authCallbackRedirect(),
        data: {
          user_type: role,
          display_name: email.split('@')[0],
          country_code: country,
        },
      },
    });
    if (otpErr) {
      setError(otpErr.message);
      setBusy(null);
      return;
    }
    markGateCompleted();
    setEmailSent(true);
    setBusy(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 text-center pb-2">
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Step 5 of 5</span>
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          Claim & save your ticket
        </h2>
        <p className="text-xs text-white/65">
          Save <span className="font-mono font-bold text-orange-400">{ticketCode}</span> + {bbAwarded} BB to your account.
        </p>
      </div>

      <div
        className="rounded-[14px] p-3 text-left"
        style={{ background: 'rgba(255,95,31,0.06)', border: '1px solid rgba(255,95,31,0.25)' }}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/50 uppercase tracking-wider font-bold">Your raffle ticket</span>
          <span className="font-mono font-black text-orange-300">{ticketCode}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1">
          <span className="text-white/50 uppercase tracking-wider font-bold">Welcome BB</span>
          <span className="font-black text-orange-300">+{bbAwarded}</span>
        </div>
      </div>

      {!emailSent && (
        <div className="space-y-2">
          <SocialBtn label="Continue with Google" busy={busy === 'google'} onClick={() => oauth('google')} />
          <SocialBtn label="Continue with Apple" busy={busy === 'apple'} onClick={() => oauth('apple')} />
          <SocialBtn label="Continue with Meta" busy={busy === 'facebook'} onClick={() => oauth('facebook')} />

          <div className="relative my-3 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-wider text-white/40">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={emailMagicLink}
            disabled={busy !== null}
            className="w-full h-11 rounded-[12px] text-xs font-bold uppercase tracking-wider text-white/85 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {busy === 'email' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Send magic link to {email}
          </button>
        </div>
      )}

      {emailSent && (
        <div className="space-y-3">
          <div
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ color: '#00F0FF', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.3)' }}
          >
            <Check className="w-3.5 h-3.5" /> Magic link sent
          </div>
          <p className="text-xs text-white/65">
            Check <span className="font-mono font-bold text-orange-400">{email}</span>. Click the link to claim ticket{' '}
            <span className="font-mono font-bold text-orange-400">{ticketCode}</span>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white"
            style={{
              background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 24px rgba(255,95,31,0.45)',
            }}
          >
            Got it
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400 flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
    </motion.div>
  );
};

const SocialBtn = ({ label, busy, onClick }: { label: string; busy: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    className="w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
    style={{
      background: 'linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)',
      border: '1px solid rgba(255,255,255,0.3)',
      boxShadow: '0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
    }}
  >
    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
    {label}
  </button>
);
