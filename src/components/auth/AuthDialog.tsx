import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, User, Scissors, Users, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CountrySelector } from '@/components/CountrySelector';
import { ArenaGateModal, ArenaGateResult } from './ArenaGateModal';
import { toast } from 'sonner';

interface AuthDialogProps {
  children: React.ReactNode;
  initialRole?: 'barber' | 'fan';
  prefilledCountry?: string;
  prefilledEmail?: string;
  autoOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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
    // Account is already created inside Arena Gate!
    // Just close the modal and dialog - auth state change will handle redirect
    setShowArenaGate(false);
    setArenaGateVerified(true);
    handleOpenChange(false);
  };

  const handleArenaGateClose = () => {
    setShowArenaGate(false);
    // If they close without completing, reset to fan
    if (!arenaGateVerified) {
      setSignUpData(prev => ({
        ...prev,
        userType: 'fan',
        countryCode: null
      }));
    }
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
    
    // Barbers use Arena Gate for complete signup - redirect them there
    if (signUpData.userType === 'barber') {
      setShowArenaGate(true);
      return;
    }
    
    // Country is mandatory for all users
    if (!signUpData.countryCode) {
      toast.error('Please select your country');
      return;
    }
    
    // Only fans reach here - simple signup flow
    setLoading(true);
    
    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.displayName, signUpData.userType, signUpData.countryCode);
    
    if (!error) {
      handleOpenChange(false);
      setSignUpData({ email: '', password: '', displayName: '', userType: initialRole, countryCode: prefilledCountry || null });
      setArenaGateVerified(!!prefilledCountry);
    }
    
    setLoading(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Join Barber Hub
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInData.password}
                    onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">I am a:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* BARBER Button - Orange Theme */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!arenaGateVerified) {
                          setShowArenaGate(true);
                        }
                        setSignUpData(prev => ({ ...prev, userType: "barber" }));
                      }}
                      className={`relative p-3 border transition-all duration-300 rounded-lg ${
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
                      {signUpData.userType === "barber" && !arenaGateVerified && (
                        <div className="absolute -top-1 -right-1">
                          <Badge variant="default" className="text-xs px-1 py-0">✓</Badge>
                        </div>
                      )}
                    </button>

                    {/* FAN Button - Cyan Theme */}
                    <button
                      type="button"
                      onClick={() => {
                        setSignUpData(prev => ({ ...prev, userType: "fan" }));
                        setArenaGateVerified(false);
                      }}
                      className={`relative p-3 border transition-all duration-300 rounded-lg ${
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
                  <Label htmlFor="signup-name">Display Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your Name"
                    value={signUpData.displayName}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Country</Label>
                    {arenaGateVerified && (
                      <Badge className="text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                        <Lock className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <CountrySelector
                    value={signUpData.countryCode}
                    onChange={(countryCode) => {
                      if (!arenaGateVerified) {
                        setSignUpData(prev => ({ ...prev, countryCode }));
                      }
                    }}
                    placeholder={arenaGateVerified ? "Nationality locked" : "Select your country"}
                    disabled={arenaGateVerified}
                  />
                  {signUpData.userType === 'barber' && arenaGateVerified && (
                    <p className="text-xs text-amber-500/80 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Nationality cannot be changed after sign-up
                    </p>
                  )}
                  {signUpData.userType === 'fan' && (
                    <p className="text-xs text-muted-foreground">
                      Optional - helps connect with local barbers
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
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