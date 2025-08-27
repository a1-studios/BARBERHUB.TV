import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Scissors, Users, Star, TrendingUp, Loader2 } from "lucide-react";
import Globe3D from "@/components/Globe3D";

const LandingHero = () => {
  const { signUp, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  
  // Sign In Form State
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    displayName: "",
    userType: "fan" as "barber" | "creator" | "fan" | "client",
  });

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
    setLoading(true);
    const { error } = await signUp(
      signUpData.email,
      signUpData.password,
      signUpData.displayName,
      signUpData.userType
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
        <button
          type="button"
          onClick={() => setSignUpData(prev => ({ ...prev, userType: "barber" }))}
          className={`relative p-4 border transition-all duration-300 ${
            signUpData.userType === "barber" 
              ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(24_100%_52%/0.3),inset_0_0_15px_hsl(24_100%_52%/0.1)]" 
              : "border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-[0_0_15px_hsl(24_100%_52%/0.2)]"
          }`}
          style={{ borderRadius: '1rem' }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${
              signUpData.userType === "barber" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <Scissors className="w-5 h-5" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">BARBER</div>
              <div className="text-xs text-muted-foreground">Professional Service</div>
            </div>
          </div>
          {signUpData.userType === "barber" && (
            <div className="absolute -top-1 -right-1">
              <Badge variant="default" className="text-xs">Selected</Badge>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSignUpData(prev => ({ ...prev, userType: "creator" }))}
          className={`relative p-4 border transition-all duration-300 ${
            signUpData.userType === "creator" 
              ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(24_100%_52%/0.3),inset_0_0_15px_hsl(24_100%_52%/0.1)]" 
              : "border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-[0_0_15px_hsl(24_100%_52%/0.2)]"
          }`}
          style={{ borderRadius: '1rem' }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${
              signUpData.userType === "creator" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <Star className="w-5 h-5" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">CREATOR</div>
              <div className="text-xs text-muted-foreground">Content & Influence</div>
            </div>
          </div>
          {signUpData.userType === "creator" && (
            <div className="absolute -top-1 -right-1">
              <Badge variant="default" className="text-xs">Selected</Badge>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSignUpData(prev => ({ ...prev, userType: "fan" }))}
          className={`relative p-4 border transition-all duration-300 ${
            signUpData.userType === "fan" 
              ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(24_100%_52%/0.3),inset_0_0_15px_hsl(24_100%_52%/0.1)]" 
              : "border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-[0_0_15px_hsl(24_100%_52%/0.2)]"
          }`}
          style={{ borderRadius: '1rem' }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${
              signUpData.userType === "fan" ? "bg-primary text-primary-foreground" : "bg-muted"
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
              <Badge variant="default" className="text-xs">Selected</Badge>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSignUpData(prev => ({ ...prev, userType: "client" }))}
          className={`relative p-4 border transition-all duration-300 ${
            signUpData.userType === "client" 
              ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(24_100%_52%/0.3),inset_0_0_15px_hsl(24_100%_52%/0.1)]" 
              : "border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-[0_0_15px_hsl(24_100%_52%/0.2)]"
          }`}
          style={{ borderRadius: '1rem' }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className={`p-2 rounded-full ${
              signUpData.userType === "client" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-sm">CLIENT</div>
              <div className="text-xs text-muted-foreground">Service Seeker</div>
            </div>
          </div>
          {signUpData.userType === "client" && (
            <div className="absolute -top-1 -right-1">
              <Badge variant="default" className="text-xs">Selected</Badge>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Globe3D />
      
      {/* Main content - Add top padding to account for sticky header */}
      <div className="relative z-10 flex items-center justify-center min-h-screen pt-20">
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left side - Branding and content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-6">
                <div className="flex items-center justify-center lg:justify-start space-x-3">
                  <img src="/lovable-uploads/c5bbb6c4-149e-41f8-9e68-1580ee1afdf8.png" alt="Barber Hub" className="w-12 h-12 animate-float" />
                  <h1 className="text-4xl md:text-5xl font-bold">
                    <span className="text-white">BARBER</span>
                    <span className="text-primary">-HUB</span>
                  </h1>
                </div>
                
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
                  Connect with talented barbers, discover amazing content creators, and join a thriving community of style enthusiasts.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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

            {/* Right side - Authentication */}
            <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <Card className="p-6 border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(24_100%_52%/0.5),inset_0_0_20px_hsl(24_100%_52%/0.15)] hover:border-primary/30" style={{ borderRadius: '1.5rem' }}>
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
                          onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
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
                          onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                          required
                          className="bg-background/50"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing In...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <UserTypeSelector />
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Display Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          value={signUpData.displayName}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, displayName: e.target.value }))}
                          required
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
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
                          onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                          required
                          className="bg-background/50"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;