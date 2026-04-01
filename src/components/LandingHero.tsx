import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Scissors, Users, Loader2, Sparkles } from "lucide-react";
import Globe3D from "@/components/Globe3D";
import { CountrySelector } from "@/components/CountrySelector";
import type { ArenaGateResult } from "@/components/auth/ArenaGateModal";
import { toast } from "sonner";
import { triggerCountryCelebration } from "@/utils/countryCelebration";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Provider } from "@supabase/supabase-js";


interface LandingHeroProps {
  onOpenArenaGate?: () => void;
}

const LandingHero = ({ onOpenArenaGate }: LandingHeroProps) => {
  const { signUp, signIn, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [prizeBanner, setPrizeBanner] = useState<string | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  // Arena Gate verified state (gate itself is rendered in Index.tsx)
  const [arenaGateVerified, setArenaGateVerified] = useState(false);

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  });

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    displayName: "",
    userType: "fan" as "barber" | "fan",
    countryCode: null as string | null
  });


  // Pre-fill from vault redirect params
  useEffect(() => {
    const tab = searchParams.get('tab');
    const vaultEmail = searchParams.get('email');
    const vaultRole = searchParams.get('role');
    const prizeId = searchParams.get('prize_id');

    if (tab === 'signup') {
      setActiveTab('signup');
      if (vaultEmail) setSignUpData(prev => ({ ...prev, email: vaultEmail }));
      if (vaultRole === 'barber' || vaultRole === 'fan') {
        setSignUpData(prev => ({ ...prev, userType: vaultRole }));
      }
      if (prizeId) {
        const prizeLabels: Record<string, string> = {
          tier_bronze: '1 Month Bronze Upgrade',
          bb_100: '100 BB Bonus',
          tier_silver: '1 Month Silver Upgrade',
          tier_gold_3m: '3 Months Gold Tier',
          bb_25: '25 BB Starter Pack',
          hunter_pass: 'Hunter Pass Trial',
          contender_pass: 'National Contender Pass',
        };
        setPrizeBanner(prizeLabels[prizeId] || prizeId);
      }
    }
  }, [searchParams]);

  // Mark lead as converted after signup
  useEffect(() => {
    if (user && prizeBanner) {
      const email = searchParams.get('email');
      if (email) {
        supabase
          .rpc('mark_marketing_lead_converted', { p_email: email })
          .then(() => {});
      }
    }
  }, [user, prizeBanner, searchParams]);


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(signInData.email, signInData.password);
    setLoading(false);
    if (!error) {
      // User will be redirected by auth state change
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Barbers use Arena Gate for complete signup - redirect them there
    if (signUpData.userType === 'barber') {
      onOpenArenaGate?.();
      return;
    }
    
    // Only fans reach here - simple signup flow
    if (!signUpData.countryCode) {
      toast.error('Please select your country');
      return;
    }
    setLoading(true);
    const { error } = await signUp(
      signUpData.email, 
      signUpData.password, 
      signUpData.displayName, 
      signUpData.userType, 
      signUpData.countryCode
    );
    setLoading(false);
    
    if (!error) {
      // User will be redirected by auth state change
    }
  };

  const handleSocialLogin = (provider: Provider) => {
    setPendingProvider(provider);
    setShowRolePicker(true);
  };

  const completeSocialAuth = async (role: 'barber' | 'fan') => {
    if (!pendingProvider) return;
    setSocialLoading(true);
    localStorage.setItem('pending_social_role', role);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: pendingProvider,
      options: {
        redirectTo: window.location.origin,
      }
    });

    if (error) {
      toast.error(error.message);
      localStorage.removeItem('pending_social_role');
      setSocialLoading(false);
    }
    setShowRolePicker(false);
  };

  const UserTypeSelector = () => (
    <div className="space-y-4">
      <Label className="text-sm font-medium">I am a:</Label>
      <div className="grid grid-cols-2 gap-3">
        {/* BARBER Button - Orange Theme */}
        <button 
          type="button" 
          onClick={() => {
            // For barbers, open Arena Gate if not yet verified
            if (!arenaGateVerified) {
              onOpenArenaGate?.();
            }
            setSignUpData(prev => ({ ...prev, userType: "barber" }));
          }}
          className={`relative p-4 border transition-all duration-300 ${
            signUpData.userType === "barber" 
              ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.3),inset_0_0_15px_hsl(var(--primary)/0.1)]" 
              : "border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
          }`} 
          style={{ borderRadius: '1rem' }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${
              signUpData.userType === "barber" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted"
            }`}>
              <Scissors className="w-5 h-5" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">BARBER</div>
              <div className="text-xs text-muted-foreground">Professional Service</div>
            </div>
          </div>
          {signUpData.userType === "barber" && arenaGateVerified && (
            <div className="absolute -top-1 -right-1">
              <Badge className="text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                ✓ Verified
              </Badge>
            </div>
          )}
          {signUpData.userType === "barber" && !arenaGateVerified && (
            <div className="absolute -top-1 -right-1">
              <Badge variant="default" className="text-xs">Selected</Badge>
            </div>
          )}
        </button>

        {/* FAN Button - Cyan Theme */}
        <button 
          type="button" 
          onClick={() => {
            setSignUpData(prev => ({ ...prev, userType: "fan" }));
            // Reset arena gate state when switching to fan
            setArenaGateVerified(false);
          }} 
          className={`relative p-4 border transition-all duration-300 ${
            signUpData.userType === "fan" 
              ? "border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_20px_rgba(0,217,255,0.3),inset_0_0_15px_rgba(0,217,255,0.1)]" 
              : "border-border/50 bg-card/50 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,217,255,0.2)]"
          }`} 
          style={{ borderRadius: '1rem' }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${
              signUpData.userType === "fan" 
                ? "bg-cyan-500 text-black" 
                : "bg-muted"
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">FAN</div>
              <div className="text-xs text-muted-foreground">Community Member</div>
            </div>
          </div>
          {signUpData.userType === "fan" && (
            <div className="absolute -top-1 -right-1">
              <Badge className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Selected
              </Badge>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Globe3D />
      
      {/* Main content - Positioned at top, not centered */}
      <div className="relative z-10 pt-2">
        <div className="container mx-auto px-4 py-2">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Social Login Icons */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground font-medium">Sign in with</p>
              <div className="flex items-center gap-5">
                {/* Google */}
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="w-14 h-14 rounded-full bg-card border border-border/50 flex items-center justify-center hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:border-primary/30 transition-all duration-300"
                  aria-label="Sign in with Google"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </button>

                {/* Apple */}
                <button
                  onClick={() => handleSocialLogin('apple')}
                  className="w-14 h-14 rounded-full bg-foreground flex items-center justify-center hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300"
                  aria-label="Sign in with Apple"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-background">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </button>

                {/* Instagram (Facebook/Meta OAuth) */}
                <button
                  onClick={() => handleSocialLogin('facebook')}
                  className="w-14 h-14 rounded-full flex items-center justify-center hover:shadow-[0_0_20px_rgba(225,48,108,0.4)] transition-all duration-300"
                  style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
                  aria-label="Sign in with Instagram"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3 w-full max-w-md">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">or use email</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            </div>

            {/* Sign up section */}
            <div className="w-full max-w-md mx-auto">
              <Card 
                className="p-6 border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5),inset_0_0_20px_hsl(var(--primary)/0.15)] hover:border-primary/30" 
                style={{ borderRadius: '1.5rem' }}
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input 
                          id="signin-email" 
                          type="email" 
                          value={signInData.email} 
                          onChange={e => setSignInData(prev => ({
                            ...prev,
                            email: e.target.value
                          }))} 
                          required 
                          className="bg-background/50" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <Input 
                          id="signin-password" 
                          type="password" 
                          value={signInData.password} 
                          onChange={e => setSignInData(prev => ({
                            ...prev,
                            password: e.target.value
                          }))} 
                          required 
                          className="bg-background/50" 
                        />
                      </div>
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing In...
                          </>
                        ) : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      {/* Prize banner from Vault */}
                      {prizeBanner && (
                        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-primary text-sm font-bold">
                            <Sparkles className="w-4 h-4" />
                            Prize Unlocked: {prizeBanner}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Complete signup to claim</p>
                        </div>
                      )}
                      <UserTypeSelector />
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Display Name</Label>
                        <Input 
                          id="signup-name" 
                          type="text" 
                          value={signUpData.displayName} 
                          onChange={e => setSignUpData(prev => ({
                            ...prev,
                            displayName: e.target.value
                          }))} 
                          required 
                          className="bg-background/50" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <CountrySelector 
                          value={signUpData.countryCode} 
                          onChange={countryCode => {
                            if (!arenaGateVerified) {
                              setSignUpData(prev => ({ ...prev, countryCode }));
                            }
                          }} 
                          placeholder="Select your country"
                          disabled={arenaGateVerified}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input 
                          id="signup-email" 
                          type="email" 
                          value={signUpData.email} 
                          onChange={e => setSignUpData(prev => ({
                            ...prev,
                            email: e.target.value
                          }))} 
                          required 
                          className="bg-background/50" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input 
                          id="signup-password" 
                          type="password" 
                          value={signUpData.password} 
                          onChange={e => setSignUpData(prev => ({
                            ...prev,
                            password: e.target.value
                          }))} 
                          required 
                          className="bg-background/50" 
                        />
                      </div>
                      
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </Card>

            </div>

            {/* Branding section - Below prize counter */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold max-w-2xl mx-auto">
                <span className="text-white">where </span>
                <span className="text-primary">Barbers</span>
                <span className="text-white"> become legends</span>
              </h1>
                
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-2xl mx-auto">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">Barbers</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">1.2k+</div>
                  <div className="text-sm text-muted-foreground">Creators</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">5k+</div>
                  <div className="text-sm text-muted-foreground">Community</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">98%</div>
                  <div className="text-sm text-muted-foreground">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default LandingHero;
