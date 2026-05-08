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
  const [busy, setBusy] = useState<'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const emailMagicLink = async () => {
    if (!agreed) {
      setError('You must agree to the Terms, Privacy Policy and AUP.');
      return;
    }
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
          tos_accepted_at: new Date().toISOString(),
          marketing_opt_in: marketingOptIn,
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
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Final step</span>
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          Save your ticket
        </h2>
        <p className="text-xs text-white/65">
          Lock <span className="font-mono font-bold text-orange-400">{ticketCode}</span> to your account so we can reach you Sunday.
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
        <div className="text-[10px] text-white/45 mt-1">Sunday draw · winners revealed live</div>
      </div>

      {!emailSent && (
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-left text-[11px] text-white/75 leading-snug cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-500 shrink-0"
            />
            <span>
              I agree to Barber-Hub's{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline underline-offset-2">Terms of Service</a>,{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline underline-offset-2">Privacy Policy</a>, and{' '}
              <a href="/aup" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline underline-offset-2">Acceptable Use Policy</a>. I confirm I am at least 18 years old.
            </span>
          </label>
          <label className="flex items-start gap-2 text-left text-[11px] text-white/60 leading-snug cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-400 shrink-0"
            />
            <span>I'd like to receive updates, competition alerts, and Barber-Hub news by email.</span>
          </label>
          <button
            type="button"
            onClick={emailMagicLink}
            disabled={busy !== null || !agreed}
            className="w-full h-12 rounded-[14px] font-black uppercase tracking-wider text-sm text-white flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, hsl(20,100%,56%) 0%, hsl(28,100%,50%) 50%, hsl(35,100%,65%) 100%)',
              border: '1px solid hsla(0,0%,100%,0.3)',
              boxShadow: '0 8px 24px hsla(20,100%,56%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.45)',
            }}
          >
            {busy === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send magic link
          </button>
          <p className="text-[10px] text-center text-white/40">
            We'll email <span className="font-mono text-white/60">{email}</span> a one-tap login.
          </p>
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

