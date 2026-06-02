import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\+?[0-9 ()\-]{7,}$/;

/**
 * Inline orange-glow auth: morphing email/phone placeholder, "Go" sends 6-digit OTP,
 * then collapses into a 6-cell code input. Uses Supabase Auth (email) and the
 * send-sms-otp / verify-sms-otp edge functions (phone — Twilio path).
 */
export const InlineOtpBox = () => {
  const [identity, setIdentity] = useState('');
  const [step, setStep] = useState<'identity' | 'verify'>('identity');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [focused, setFocused] = useState(false);

  const placeholders = useMemo(() => ['Sign in', 'Phone', 'Email'], []);

  useEffect(() => {
    if (focused || identity.length > 0) return;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 2000);
    return () => clearInterval(id);
  }, [focused, identity, placeholders.length]);

  const detect = (val: string): { kind: 'email' | 'phone'; value: string } | null => {
    const v = val.trim();
    if (EMAIL_RE.test(v)) return { kind: 'email', value: v };
    if (PHONE_RE.test(v)) {
      const digits = v.replace(/[^\d+]/g, '');
      return { kind: 'phone', value: digits.startsWith('+') ? digits : `+${digits}` };
    }
    return null;
  };

  const sendCode = async () => {
    const d = detect(identity);
    if (!d) {
      toast.error('Enter a valid email or phone number');
      return;
    }
    setLoading(true);
    try {
      if (d.kind === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: d.value,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
        setChannel('email');
        setIdentity(d.value);
        toast.success('Code sent to your inbox');
      } else {
        const { data, error } = await supabase.functions.invoke('send-sms-otp', {
          body: { phone: d.value },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setChannel('sms');
        setIdentity(d.value);
        toast.success('Code sent via SMS');
      }
      setStep('verify');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (token: string) => {
    if (token.length !== 6) return;
    setLoading(true);
    try {
      if (channel === 'email') {
        const { error } = await supabase.auth.verifyOtp({
          email: identity,
          token,
          type: 'email',
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
          body: { phone: identity, code: token },
        });
        if (error) throw error;
        const payload = data as any;
        if (payload?.error) throw new Error(payload.error);
        const { error: vErr } = await supabase.auth.verifyOtp({
          email: payload.email,
          token_hash: payload.hashed_token,
          type: 'magiclink',
        });
        if (vErr) throw vErr;
      }
      toast.success('Welcome to Barber Hub');
    } catch (e: any) {
      toast.error(e?.message ?? 'Invalid or expired code');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="w-full flex flex-col items-center gap-2">
        <p className="text-[11px] text-white/60">
          Code sent to <span className="text-orange-300">{identity}</span>
        </p>
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (v.length === 6) verifyCode(v);
          }}
          disabled={loading}
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="border-orange-500/60 text-orange-300 bg-black/40"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <button
          type="button"
          onClick={() => {
            setStep('identity');
            setCode('');
          }}
          className="text-[10px] text-white/45 hover:text-white/80 transition"
        >
          ← use a different email/phone
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendCode();
      }}
      className="w-full"
    >
      <div className="relative w-full">
        <input
          type="text"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholders[placeholderIdx]}
          autoComplete="email"
          className="w-full rounded-lg bg-black/40 border border-orange-500/60 pl-4 pr-12 py-2.5 text-sm text-white placeholder:text-white/40 placeholder:transition-all focus:outline-none focus:border-orange-500 focus:shadow-[0_0_24px_rgba(249,115,22,0.65)] shadow-[0_0_18px_rgba(249,115,22,0.45)] transition-shadow"
        />
        <button
          type="submit"
          disabled={loading}
          aria-label="Continue"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-orange-500/90 hover:bg-orange-500 border border-orange-400 inline-flex items-center justify-center text-white transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
};

export default InlineOtpBox;
