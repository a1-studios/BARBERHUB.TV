import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Scissors, Users, Loader2, Lock, Sparkles } from "lucide-react";
import Globe3D from "@/components/Globe3D";
import { CountrySelector } from "@/components/CountrySelector";
import WorldCupPrizeCounter from "@/components/WorldCupPrizeCounter";
import type { ArenaGateResult } from "@/components/auth/ArenaGateModal";
import { toast } from "sonner";
import { triggerCountryCelebration } from "@/utils/countryCelebration";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";


interface LandingHeroProps {
  onOpenArenaGate?: () => void;
}

const LandingHero = ({ onOpenArenaGate }: LandingHeroProps) => {
  const { signUp, signIn, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [prizeBanner, setPrizeBanner] = useState<string | null>(null);
  

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
          .from('marketing_leads')
          .update({ converted: true })
          .eq('email', email)
          .then(() => {});
      }
    }
  }, [user, prizeBanner, searchParams]);

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
    setLoading(false);
    if (!error) {
      // User will be redirected by auth state change
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Barbers use Arena Gate for complete signup - redirect them there
    if (signUpData.userType === 'barber') {
      setShowArenaGate(true);
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
              setShowArenaGate(true);
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
            {/* World Cup Prize Counter - Top position */}
            <div className="flex justify-center">
              <WorldCupPrizeCounter />
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

      {/* Arena Gate Modal for Barbers */}
      <ArenaGateModal
        isOpen={showArenaGate}
        onClose={handleArenaGateClose}
        onComplete={handleArenaGateComplete}
      />
    </section>
  );
};

export default LandingHero;
