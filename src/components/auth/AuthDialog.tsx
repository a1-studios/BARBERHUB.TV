import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Sparkles } from 'lucide-react';
import { ForgotPasswordForm } from './ForgotPasswordForm';

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
    onOpenChange?.(newOpen);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(signInData.email, signInData.password);
    if (!error) {
      handleOpenChange(false);
      setSignInData({ email: '', password: '' });
    }
    setLoading(false);
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
