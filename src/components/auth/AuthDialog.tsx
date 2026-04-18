import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, User, Scissors, Users, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CountrySelector } from '@/components/CountrySelector';
import { ArenaGateModal, ArenaGateResult } from './ArenaGateModal';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AuthDialogProps {
  children: React.ReactNode;
  initialRole?: 'barber' | 'fan';
  prefilledCountry?: string;
  prefilledEmail?: string;
  autoOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Read pending spin-wheel prize from localStorage (set by FinalizeStep.tsx)
function getPendingPrizeLabel(): string | null {
  try {
    const raw = localStorage.getItem('pending_spin_prize');
    if (!raw) return null;
    const pending = JSON.parse(raw);
    const ageMs = Date.now() - (pending.timestamp || 0);
    if (ageMs > 24 * 60 * 60 * 1000) return null;
    return pending.prize_label || null;
  } catch {
    return null;
  }
}

// Shared input class — 14px rounding, orange accents
const inputClass = "rounded-[14px] border-orange-500/40 focus-visible:ring-orange-500 focus-visible:border-orange-500 bg-background/60";
const labelClass = "text-white";

export function AuthDialog({ 
  children, 
  initialRole = 'fan', 
  prefilledCountry,
  prefilledEmail,
  autoOpen = false,
  onOpenChange,
}: AuthDialogProps) {
  const [open, setOpen] = useState(autoOpen);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [prizeLabel, setPrizeLabel] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  // Arena Gate state for barbers
  const [showArenaGate, setShowArenaGate] = useState(false);
  const [arenaGateVerified, setArenaGateVerified] = useState(!!prefilledCountry);

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  const [signUpData, setSignUpData] = useState({
    email: prefilledEmail || '',
    password: '',
    displayName: '',
    userType: initialRole,
    countryCode: prefilledCountry || null as string | null,
  });

  // Handle autoOpen
  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
    }
  }, [autoOpen]);

  // Read pending prize when dialog opens
  useEffect(() => {
    if (open) {
      setPrizeLabel(getPendingPrizeLabel());
    }
  }, [open]);

  // Handle prefilled country from Arena Gate
  useEffect(() => {
    if (prefilledCountry) {
      setSignUpData(prev => ({ ...prev, countryCode: prefilledCountry }));
      setArenaGateVerified(true);
    }
  }, [prefilledCountry]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleArenaGateComplete = (result: ArenaGateResult) => {
    setShowArenaGate(false);
    setArenaGateVerified(true);
    handleOpenChange(false);
  };

  const handleArenaGateClose = () => {
    setShowArenaGate(false);
    if (!arenaGateVerified) {
      setSignUpData(prev => ({
        ...prev,
        userType: 'fan',
        countryCode: null
      }));
    }
  };

  // OAuth: Google works; Apple/Instagram show "coming soon" until configured in Supabase.
  // After OAuth completes, useAuth listener fires and Auth.tsx/Index.tsx auto-claims the prize.
  const handleGoogleAuth = async () => {
    // Persist the role choice so post-OAuth assignment picks it up
    localStorage.setItem('pending_social_role', signUpData.userType);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) toast.error(error.message);
  };

  const handleComingSoonAuth = (provider: string) => {
    toast.info(`${provider} sign-in coming soon — use Google or email for now.`);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.userType === 'barber') {
      setShowArenaGate(true);
      return;
    }
    
    if (!signUpData.countryCode) {
      toast.error('Please select your country');
      return;
    }
    
    setLoading(true);
    
    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.displayName, signUpData.userType, signUpData.countryCode);
    
    if (!error) {
      handleOpenChange(false);
      setSignUpData({ email: '', password: '', displayName: '', userType: initialRole, countryCode: prefilledCountry || null });
      setArenaGateVerified(!!prefilledCountry);
    }
    
    setLoading(false);
  };

  const ctaLabel = prizeLabel ? '⚡ CLAIM & CREATE ACCOUNT' : '⚡ CREATE ACCOUNT';

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[440px] rounded-[14px] border-orange-500/30 bg-background">
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-[14px]">
              <TabsTrigger value="signin" className="rounded-[12px]">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-[12px]">Sign Up</TabsTrigger>
            </TabsList>

            {/* SIGN UP TAB — offer-driven claim screen */}
            <TabsContent value="signup" className="space-y-4 mt-4">
              <DialogHeader className="space-y-2 text-center">
                <DialogTitle className="text-2xl md:text-3xl font-black uppercase tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent leading-tight">
                  {prizeLabel ? `CLAIM ${prizeLabel}` : 'JOIN THE ARENA'}
                </DialogTitle>
                {prizeLabel && (
                  <p className="text-sm text-muted-foreground">
                    Create your account to lock it in.
                  </p>
                )}
              </DialogHeader>

              {/* Social auth row — one-click intake */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    aria-label="Continue with Google"
                    className="h-11 rounded-[14px] bg-white hover:ring-2 hover:ring-orange-500 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComingSoonAuth('Apple')}
                    aria-label="Continue with Apple"
                    className="h-11 rounded-[14px] bg-white hover:ring-2 hover:ring-orange-500 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="black">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComingSoonAuth('Instagram')}
                    aria-label="Continue with Instagram"
                    className="h-11 rounded-[14px] bg-white hover:ring-2 hover:ring-orange-500 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <defs>
                        <linearGradient id="ig-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#feda75"/>
                          <stop offset="50%" stopColor="#d62976"/>
                          <stop offset="100%" stopColor="#4f5bd5"/>
                        </linearGradient>
                      </defs>
                      <path fill="url(#ig-grad)" d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.39C1.34 2.69.92 3.36.62 4.15.32 4.91.12 5.78.06 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.14.56 2.91.3.79.72 1.46 1.39 2.13.67.67 1.34 1.09 2.13 1.39.77.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.14-.26 2.91-.56.79-.3 1.46-.72 2.13-1.39.67-.67 1.09-1.34 1.39-2.13.3-.77.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.14-.56-2.91-.3-.79-.72-1.46-1.39-2.13C21.31 1.34 20.64.92 19.85.62c-.77-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 0 0 5.84 12 6.16 6.16 0 0 0 12 18.16 6.16 6.16 0 0 0 18.16 12 6.16 6.16 0 0 0 12 5.84zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/>
                    </svg>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or sign up with email</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-3">
                  <Label className={`text-sm font-medium ${labelClass}`}>I am a:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!arenaGateVerified) {
                          setShowArenaGate(true);
                        }
                        setSignUpData(prev => ({ ...prev, userType: "barber" }));
                      }}
                      className={`relative p-3 border transition-all duration-300 rounded-[14px] ${
                        signUpData.userType === "barber" 
                          ? "border-primary bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.3)]" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <Scissors className="w-4 h-4" />
                        <span className="text-xs font-medium">BARBER</span>
                      </div>
                      {signUpData.userType === "barber" && arenaGateVerified && (
                        <div className="absolute -top-1 -right-1">
                          <Badge className="text-xs px-1 py-0 bg-green-500/20 text-green-400 border border-green-500/30">✓</Badge>
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSignUpData(prev => ({ ...prev, userType: "fan" }));
                        setArenaGateVerified(false);
                      }}
                      className={`relative p-3 border transition-all duration-300 rounded-[14px] ${
                        signUpData.userType === "fan" 
                          ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(0,217,255,0.3)]" 
                          : "border-border hover:border-cyan-500/50"
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-medium">FAN</span>
                      </div>
                      {signUpData.userType === "fan" && (
                        <div className="absolute -top-1 -right-1">
                          <Badge className="text-xs px-1 py-0 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">✓</Badge>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className={labelClass}>Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your Name"
                    value={signUpData.displayName}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, displayName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Country</Label>
                  <div className="[&_button]:rounded-[14px] [&_button]:border-orange-500/40">
                    <CountrySelector
                      value={signUpData.countryCode}
                      onChange={(countryCode) => {
                        if (!arenaGateVerified) {
                          setSignUpData(prev => ({ ...prev, countryCode }));
                        }
                      }}
                      placeholder="Select your country"
                      disabled={arenaGateVerified}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className={labelClass}>Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className={labelClass}>Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className={inputClass}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-[14px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider text-base shadow-lg shadow-orange-500/30 border-0"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-1 h-4 w-4" />}
                  {ctaLabel}
                </Button>
              </form>
            </TabsContent>

            {/* SIGN IN TAB — cohesive style, no offer treatment */}
            <TabsContent value="signin" className="space-y-4 mt-4">
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
              <form onSubmit={handleSignIn} className="space-y-4">
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
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Arena Gate Modal for Barbers */}
      <ArenaGateModal
        isOpen={showArenaGate}
        onClose={handleArenaGateClose}
        onComplete={handleArenaGateComplete}
      />
    </>
  );
}
