import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Phone, ShieldCheck, KeyRound } from 'lucide-react';
import { PublicBarber, countryFlag } from '@/components/landing/teasers/useLandingData';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

type Step = 'identity' | 'verify';
type Channel = 'email' | 'sms';

interface AuthModalV2Props {
  open: boolean;
  onClose: () => void;
  mode?: 'signup' | 'signin';
  previewBarber?: PublicBarber | null;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Detect whether the user typed an email or a phone number.
 * Returns the canonical value (email lowercase or E.164 phone) or null on failure.
 */
function classifyIdentity(raw: string, defaultCountry: CountryCode = 'US'):
  | { channel: 'email'; value: string }
  | { channel: 'sms'; value: string }
  | null {
  const v = raw.trim();
  if (!v) return null;
  if (EMAIL_RE.test(v)) return { channel: 'email', value: v.toLowerCase() };
  const digits = v.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 7) return null;
  const parsed = parsePhoneNumberFromString(digits, defaultCountry);
  if (parsed?.isValid()) return { channel: 'sms', value: parsed.number };
  return null;
}

/**
 * Frictionless OTP auth modal — identity → verify, no gate, no role selection.
 * New users land as the default `fan` role (DB trigger). Role + VIP upgrade
 * happens later inside ProfileCompletionGate.
 */
export function AuthModalV2({
  open,
  onClose,
  mode = 'signup',
  previewBarber = null,
}: AuthModalV2Props) {
  const [step, setStep] = useState<Step>('identity');
  const [identity, setIdentity] = useState('');
  const [defaultCountry] = useState<CountryCode>('US');
  const [channel, setChannel] = useState<Channel>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const resendTimer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setStep('identity');
      setIdentity('');
      setChannel('email');
      setEmail('');
      setPhone('');
      setPin('');
      setLoading(false);
      setResendIn(0);
    }
  }, [open, mode]);

  useEffect(() => {
    if (resendIn <= 0) return;
    resendTimer.current = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => {
      if (resendTimer.current) window.clearTimeout(resendTimer.current);
    };
  }, [resendIn]);

  const closeAndReset = () => onClose();

  // Identity submit — smart-detect email vs phone
  const handleIdentitySubmit = async () => {
    const detected = classifyIdentity(identity, defaultCountry);
    if (!detected) {
      toast.error('Enter a valid email address or phone number.');
      return;
    }
    setLoading(true);
    try {
      if (detected.channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: detected.value,
          options: { shouldCreateUser: mode === 'signup' },
        });
        if (error) throw error;
        setEmail(detected.value);
        setPhone('');
        setChannel('email');
        toast.success('Code sent. Check your inbox.');
      } else {
        const { data, error } = await supabase.functions.invoke('send-sms-otp', {
          body: { phone: detected.value },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setPhone(detected.value);
        setEmail('');
        setChannel('sms');
        toast.success('Code sent via SMS.');
      }
      setStep('verify');
      setResendIn(60);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  // Verify (channel-aware)
  const handleVerify = async (token: string) => {
    if (token.length !== 6) return;
    setLoading(true);
    try {
      if (channel === 'email') {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
          body: { phone, code: token },
        });
        if (error) throw error;
        const payload = data as any;
        if (payload?.error) throw new Error(payload.error);
        const hashed = payload?.hashed_token as string | undefined;
        const linkEmail = payload?.email as string | undefined;
        if (!hashed || !linkEmail) throw new Error('Verification did not return a session token.');
        const { error: vErr } = await supabase.auth.verifyOtp({
          email: linkEmail,
          token_hash: hashed,
          type: 'magiclink',
        });
        if (vErr) throw vErr;
      }
      toast.success('Welcome to Barber Hub.');
      closeAndReset();
    } catch (e: any) {
      toast.error(e?.message ?? 'Invalid or expired code.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setLoading(true);
    try {
      if (channel === 'email') {
        if (!email) return;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: mode === 'signup' },
        });
        if (error) throw error;
      } else {
        if (!phone) return;
        const { data, error } = await supabase.functions.invoke('send-sms-otp', {
          body: { phone },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
      }
      setResendIn(60);
      toast.success('New code sent.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not resend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-5 w-5 text-orange-500" />
            {mode === 'signin' ? 'Welcome back' : 'Enter Barber Hub'}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {step === 'identity' && 'Enter your email or phone — we’ll send a 6-digit code. No password needed.'}
            {step === 'verify' && `Enter the code we sent to ${channel === 'sms' ? phone : email}.`}
          </DialogDescription>
        </DialogHeader>

        {previewBarber && step === 'identity' && (
          <div className="rounded-xl border border-orange-500/40 bg-gradient-to-br from-orange-500/10 to-cyan-400/10 p-3 flex items-center gap-3">
            {previewBarber.avatar_url ? (
              <img
                src={previewBarber.avatar_url}
                alt={previewBarber.display_name ?? 'Barber'}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-orange-400/60"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/[0.06] ring-2 ring-orange-400/60 flex items-center justify-center text-xl">
                {countryFlag(previewBarber.country_code)}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {previewBarber.display_name ?? 'Barber'} {countryFlag(previewBarber.country_code)}
              </div>
              <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                Sign up to book, follow & throw down.
              </div>
            </div>
          </div>
        )}

        {step === 'identity' && (() => {
          const detected = classifyIdentity(identity, defaultCountry);
          const Icon = detected?.channel === 'sms' ? Phone : Mail;
          return (
            <div className="space-y-4">
              <div>
                <Label className="text-white/70">Email or Phone Number</Label>
                <div className="relative mt-1">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    placeholder="you@example.com  or  +1 555 123 4567"
                    className="pl-9 bg-white/5 border-white/10 text-white"
                    autoFocus
                    inputMode={detected?.channel === 'sms' ? 'tel' : 'email'}
                    autoComplete={detected?.channel === 'sms' ? 'tel' : 'email'}
                    onKeyDown={(e) => e.key === 'Enter' && handleIdentitySubmit()}
                  />
                </div>
                <p className="mt-2 text-[11px] text-white/40">
                  {detected?.channel === 'sms'
                    ? `We’ll text a code to ${detected.value}. Msg & data rates may apply. Reply STOP to opt out.`
                    : 'Use the email or phone tied to your account. SMS uses standard message rates.'}
                </p>
              </div>
              <Button onClick={handleIdentitySubmit} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send 6-digit code'}
              </Button>
              <p className="text-[10px] text-center text-white/40">
                By continuing you agree to our Terms &amp; Privacy Policy.
              </p>
            </div>
          );
        })()}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={pin}
                onChange={(v) => {
                  setPin(v);
                  if (v.length === 6) handleVerify(v);
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              onClick={() => handleVerify(pin)}
              disabled={loading || pin.length !== 6}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><KeyRound className="h-4 w-4 mr-2" />Verify</>)}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button onClick={() => setStep('identity')} className="text-white/50 hover:text-white">
                Edit {channel === 'sms' ? 'phone' : 'email'}
              </button>
              <button
                onClick={handleResend}
                disabled={resendIn > 0 || loading}
                className="text-orange-400 disabled:text-white/30"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AuthModalV2;
