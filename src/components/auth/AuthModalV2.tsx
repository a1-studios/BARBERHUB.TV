import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformState } from '@/hooks/usePlatformState';
import { toast } from 'sonner';
import { Loader2, Mail, Scissors, Users, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';

type Role = 'barber' | 'fan';
type Step = 'gate' | 'role' | 'identity' | 'verify';

interface AuthModalV2Props {
  open: boolean;
  onClose: () => void;
  intendedRole?: Role | null;
  mode?: 'signup' | 'signin';
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,}$/;

/**
 * Parallel OTP + VIP auth modal. Isolated from the legacy AuthDialog/useAuth API.
 * Mounted only by VelvetRopeLanding. Uses supabase.auth.* directly so we don't
 * touch existing exports while the new flow is being validated.
 */
export function AuthModalV2({
  open,
  onClose,
  intendedRole = null,
  mode = 'signup',
}: AuthModalV2Props) {
  const { value: vipModeRaw } = usePlatformState('global_vip_mode');
  const vipMode = useMemo(() => vipModeRaw === 'true', [vipModeRaw]);

  const [step, setStep] = useState<Step>(mode === 'signin' ? 'identity' : 'gate');
  const [code, setCode] = useState('');
  const [validatedCode, setValidatedCode] = useState<{ id: string; type: string } | null>(null);
  const [role, setRole] = useState<Role | null>(intendedRole);
  const [identity, setIdentity] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const resendTimer = useRef<number | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(mode === 'signin' ? 'identity' : 'gate');
      setCode('');
      setValidatedCode(null);
      setRole(intendedRole ?? null);
      setIdentity('');
      setEmail('');
      setPin('');
      setLoading(false);
      setResendIn(0);
    }
  }, [open, intendedRole, mode]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    resendTimer.current = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => {
      if (resendTimer.current) window.clearTimeout(resendTimer.current);
    };
  }, [resendIn]);

  const closeAndReset = () => {
    onClose();
  };

  // Step 1: Gate
  const handleGateSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      if (vipMode) {
        toast.error('A VIP invite code is required.');
        return;
      }
      // Optional + empty → skip validation
      setValidatedCode(null);
      advanceFromGate();
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_access_code', { p_code: trimmed });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.valid) {
        toast.error('Invalid or exhausted code.');
        return;
      }
      setValidatedCode({ id: row.code_id as string, type: row.type as string });
      advanceFromGate();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not validate code.');
    } finally {
      setLoading(false);
    }
  };

  const advanceFromGate = () => {
    if (mode === 'signup' && !role) setStep('role');
    else setStep('identity');
  };

  // Step 2: Role
  const pickRole = (r: Role) => {
    setRole(r);
    setStep('identity');
  };

  // Step 3: Identity
  const handleIdentitySubmit = async () => {
    const v = identity.trim();
    if (PHONE_RE.test(v) && !EMAIL_RE.test(v)) {
      toast.info('SMS login is in beta. Please use your email.');
      return;
    }
    if (!EMAIL_RE.test(v)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: v,
        options: {
          shouldCreateUser: mode === 'signup',
          data: role ? { intended_role: role } : undefined,
        },
      });
      if (error) throw error;
      setEmail(v);
      setStep('verify');
      setResendIn(60);
      toast.success('Code sent. Check your inbox.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Verify
  const handleVerify = async (token: string) => {
    if (token.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (userId && role) {
        // Mirror existing onboarding writes — binary role only, sub-category
        // remains owned by the existing post-signup onboarding flow.
        await supabase.from('user_roles').upsert(
          { user_id: userId, role },
          { onConflict: 'user_id,role', ignoreDuplicates: true },
        );
        await supabase
          .from('profiles')
          .update({ user_type: role })
          .eq('user_id', userId);
      }
      if (validatedCode && userId) {
        await supabase.rpc('redeem_access_code', {
          p_code: code.trim().toUpperCase(),
          p_user_id: userId,
          p_email: email,
        });
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
    if (resendIn > 0 || !email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: mode === 'signup' },
      });
      if (error) throw error;
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
            {mode === 'signin' ? 'Welcome back' : 'Redeem your invite'}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {step === 'gate' && (vipMode ? 'A VIP invite code is required to enter.' : 'Enter a promo or referral code, or continue without one.')}
            {step === 'role' && 'Choose how you’ll experience Barber Hub.'}
            {step === 'identity' && (mode === 'signin' ? 'Enter your email — we’ll send a 6-digit code.' : 'We’ll email you a 6-digit code — no password needed.')}
            {step === 'verify' && `Enter the code we sent to ${email}.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'gate' && (
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">{vipMode ? 'VIP Invite Code' : 'Promo / Referral Code (optional)'}</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VIP-XXXXX"
                className="mt-1 bg-white/5 border-white/10 text-white uppercase tracking-widest"
                autoFocus
              />
            </div>
            <Button onClick={handleGateSubmit} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
            </Button>
          </div>
        )}

        {step === 'role' && (
          <div className="space-y-3">
            <button
              onClick={() => pickRole('barber')}
              className="w-full text-left rounded-xl border border-white/10 hover:border-orange-500/60 hover:bg-orange-500/5 transition p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <Scissors className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <div className="font-semibold">I’m a Barber</div>
                  <div className="text-xs text-white/50">Compete, stream, educate, earn BB.</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => pickRole('fan')}
              className="w-full text-left rounded-xl border border-white/10 hover:border-cyan-400/60 hover:bg-cyan-400/5 transition p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-400/15 flex items-center justify-center">
                  <Users className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <div className="font-semibold">I’m a Fan</div>
                  <div className="text-xs text-white/50">Vote, sponsor, watch live battles.</div>
                </div>
              </div>
            </button>
            <Button variant="ghost" size="sm" onClick={() => setStep('gate')} className="text-white/50">
              <ArrowLeft className="h-3 w-3 mr-1" /> Back
            </Button>
          </div>
        )}

        {step === 'identity' && (
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Email or Phone Number</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9 bg-white/5 border-white/10 text-white"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleIdentitySubmit()}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/40">SMS login is in beta — email only for now.</p>
            </div>
            <Button onClick={handleIdentitySubmit} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send 6-digit code'}
            </Button>
            {mode === 'signup' && !intendedRole && (
              <Button variant="ghost" size="sm" onClick={() => setStep('role')} className="text-white/50">
                <ArrowLeft className="h-3 w-3 mr-1" /> Change role
              </Button>
            )}
          </div>
        )}

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
                Edit email
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
