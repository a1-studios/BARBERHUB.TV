import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import Globe3D from "@/components/Globe3D";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

interface LandingHeroProps {
  /** Opens the unified gamified onboarding wizard (Role → Spin → Intake → Finalize). */
  onStartSignup?: () => void;
  /** Backwards-compat alias kept so older callers don't break. */
  onOpenArenaGate?: () => void;
}

const LandingHero = ({ onStartSignup, onOpenArenaGate }: LandingHeroProps) => {
  const { signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [signInData, setSignInData] = useState({ email: "", password: "" });

  // Coming from a vault redirect with ?tab=signup → kick straight into the wizard.
  useEffect(() => {
    if (searchParams.get("tab") === "signup") {
      (onStartSignup ?? onOpenArenaGate)?.();
    }
  }, [searchParams, onStartSignup, onOpenArenaGate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn(signInData.email, signInData.password);
    setLoading(false);
  };

  const startSignup = () => {
    (onStartSignup ?? onOpenArenaGate)?.();
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Globe3D />

      <div className="relative z-10 pt-2">
        <div className="container mx-auto px-4 py-2">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="w-full max-w-md mx-auto mt-12">
              <Card
                className="p-6 border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5),inset_0_0_20px_hsl(var(--primary)/0.15)] hover:border-primary/30"
                style={{ borderRadius: "1.5rem" }}
              >
                {/* Primary CTA — gamified signup */}
                <button
                  type="button"
                  onClick={startSignup}
                  className="w-full h-14 rounded-[14px] font-black uppercase tracking-wider text-base text-white flex items-center justify-center gap-2 mb-4 transition-transform active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #FF5F1F 0%, #FF8C00 50%, #FFB347 100%)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 8px 24px rgba(255,95,31,0.45), inset 0 1px 0 rgba(255,255,255,0.45)",
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  Spin to Win & Join
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/80 px-2 text-muted-foreground">or sign in</span>
                  </div>
                </div>

                {showForgot ? (
                  <ForgotPasswordForm
                    initialEmail={signInData.email}
                    onBack={() => setShowForgot(false)}
                  />
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={signInData.email}
                        onChange={(e) =>
                          setSignInData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        required
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <button
                          type="button"
                          onClick={() => setShowForgot(true)}
                          className="text-xs text-orange-500 hover:underline"
                        >
                          Forgot?
                        </button>
                      </div>
                      <Input
                        id="signin-password"
                        type="password"
                        value={signInData.password}
                        onChange={(e) =>
                          setSignInData((prev) => ({ ...prev, password: e.target.value }))
                        }
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
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                )}
              </Card>
            </div>

            <div className="text-center space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold max-w-2xl mx-auto">
                <span className="text-white">where </span>
                <span className="text-primary">Barbers</span>
                <span className="text-white"> become legends</span>
              </h1>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-2xl mx-auto">
                <Stat value="500+" label="Barbers" />
                <Stat value="1.2k+" label="Creators" />
                <Stat value="5k+" label="Community" />
                <Stat value="98%" label="Satisfaction" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div className="text-2xl md:text-3xl font-bold text-primary">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

export default LandingHero;
