import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Sparkles, MailCheck } from 'lucide-react';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthDialogProps {
  children: React.ReactNode;
  /** Kept for backward compatibility but ignored — sign-up is now handled by the unified gate on /. */
  initialRole?: 'barber' | 'fan';
  prefilledCountry?: string;
  prefilledEmail?: string;
  autoOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const inputClass =
  'rounded-[14px] border-orange-500/40 focus-visible:ring-orange-500 focus-visible:border-orange-500 bg-background/60';
const labelClass = 'text-white';

/**
 * Sign-in-only dialog. New-account creation is handled exclusively by the
 * unified gamified onboarding flow mounted on `/` (see LaunchWizard).
 */
export function AuthDialog({
  children,
  prefilledEmail,
  autoOpen = false,
  onOpenChange,
}: AuthDialogProps) {
  const [open, setOpen] = useState(autoOpen);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [signInData, setSignInData] = useState({
    email: prefilledEmail || '',
    password: '',
  });

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) setNeedsConfirm(false);
    onOpenChange?.(newOpen);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNeedsConfirm(false);
    const { error } = await signIn(signInData.email, signInData.password);
    if (!error) {
      handleOpenChange(false);
      setSignInData({ email: '', password: '' });
    } else {
      // Detect "email not confirmed" so we can offer a recovery action
      const code = (error as any).code as string | undefined;
      const msg = (error.message || '').toLowerCase();
      if (code === 'email_not_confirmed' || msg.includes('not confirmed') || msg.includes('email not confirmed')) {
        setNeedsConfirm(true);
      }
    }
    setLoading(false);
  };

  const handleResendConfirm = async () => {
    if (!signInData.email.trim()) {
      toast.error('Enter your email first');
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: signInData.email.trim().toLowerCase(),
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

  const handleStartSignup = () => {
    handleOpenChange(false);
    navigate('/');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px] rounded-[14px] border-orange-500/30 bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            Sign In
          </DialogTitle>
        </DialogHeader>

        {showForgot ? (
          <ForgotPasswordForm
            initialEmail={signInData.email}
            onBack={() => setShowForgot(false)}
          />
        ) : (
          <>
            <form onSubmit={handleSignIn} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className={labelClass}>Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signInData.email}
                  onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password" className={labelClass}>Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-orange-500 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="signin-password"
                  type="password"
                  value={signInData.password}
                  onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>

              {needsConfirm && (
                <div className="rounded-[12px] border border-orange-500/40 bg-orange-500/10 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <MailCheck className="h-4 w-4 mt-0.5 text-orange-400 shrink-0" />
                    <p className="text-xs text-orange-100 leading-relaxed">
                      Your email isn't confirmed yet. Check your inbox (and spam folder) for the confirmation link, or resend it below.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendConfirm}
                    disabled={resending}
                    className="w-full text-xs font-bold uppercase tracking-wider text-orange-300 hover:text-orange-200 underline underline-offset-2 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                  >
                    {resending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Resend confirmation email
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[14px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider text-base shadow-lg shadow-orange-500/30 border-0"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-border/50 text-center space-y-2">
              <p className="text-xs text-muted-foreground">New here?</p>
              <button
                type="button"
                onClick={handleStartSignup}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-500 hover:text-orange-400 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Spin to create an account
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
