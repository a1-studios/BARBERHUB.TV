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
          className={`relative p-4 rounded-lg border-2 transition-all duration-200 group ${
            signUpData.userType === "barber" 
              ? "border-primary bg-primary/5 shadow-glow" 
              : "border-border hover:border-primary/50 bg-card"
          }`}
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
          className={`relative p-4 rounded-lg border-2 transition-all duration-200 group ${
            signUpData.userType === "creator" 
              ? "border-primary bg-primary/5 shadow-glow" 
              : "border-border hover:border-primary/50 bg-card"
          }`}
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
          className={`relative p-4 rounded-lg border-2 transition-all duration-200 group ${
            signUpData.userType === "fan" 
              ? "border-primary bg-primary/5 shadow-glow" 
              : "border-border hover:border-primary/50 bg-card"
          }`}
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
          className={`relative p-4 rounded-lg border-2 transition-all duration-200 group ${
            signUpData.userType === "client" 
              ? "border-primary bg-primary/5 shadow-glow" 
              : "border-border hover:border-primary/50 bg-card"
          }`}
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 3D Globe Background */}
      <Globe3D />
      
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding & Info */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <Scissors className="w-10 h-10 text-primary" />
                <h1 className="text-4xl lg:text-6xl font-bold text-gradient">
                  BARBER-HUB
                </h1>
              </div>
              
              <p className="text-xl lg:text-2xl max-w-lg">
                <span className="text-muted-foreground">Where </span>
                <span className="text-primary font-semibold">Barbers</span>
                <span className="text-muted-foreground"> become </span>
                <span className="text-primary font-semibold">Legends</span>
              </p>

              <p className="text-muted-foreground max-w-md">
                Join the ultimate platform for barbers, creators, and the community that celebrates exceptional grooming artistry.
              </p>
            </div>

            {/* Stats Preview */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              <div className="bg-card/30 backdrop-blur-sm rounded-xl p-4 card-gradient">
                <div className="text-2xl font-bold text-primary">5K+</div>
                <div className="text-xs text-muted-foreground">Barbers</div>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-xl p-4 card-gradient">
                <div className="text-2xl font-bold text-primary">100K+</div>
                <div className="text-xs text-muted-foreground">Votes</div>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-xl p-4 card-gradient">
                <div className="text-2xl font-bold text-primary">$50K+</div>
                <div className="text-xs text-muted-foreground">Grants</div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Forms */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-card/80 backdrop-blur-md border-border/50 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">Join the Community</CardTitle>
                <CardDescription>
                  Start your journey in the world of professional barbering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                        className="w-full btn-primary shadow-glow"
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
                        className="w-full btn-primary shadow-glow"
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;