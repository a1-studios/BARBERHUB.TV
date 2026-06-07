import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, ArrowRight, Mail } from "lucide-react";
import { AuthModalV2 } from "@/components/auth/AuthModalV2";
import barberPole from "@/assets/barber-pole.png";

interface LandingHeroProps {
  onStartSignup?: () => void;
  onOpenArenaGate?: () => void;
}

const LandingHero = ({ onStartSignup, onOpenArenaGate }: LandingHeroProps) => {
  const [searchParams] = useSearchParams();
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    if (searchParams.get("tab") === "signup") {
      (onStartSignup ?? onOpenArenaGate)?.();
    }
  }, [searchParams, onStartSignup, onOpenArenaGate]);

  const startSignup = () => (onStartSignup ?? onOpenArenaGate)?.();

  return (
    <section className="relative min-h-[100svh] w-full flex items-center justify-center px-5 py-10 overflow-hidden bg-background">
      <div className="relative w-full max-w-md mx-auto">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Tagline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-foreground">
              where{" "}
              <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                Barbers
              </span>{" "}
              become legends
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Battle. Vote. Earn. The world's first barber competition platform.
            </p>
          </div>

          {/* Auth card */}
          <div className="w-full space-y-3">
            {/* Primary CTA */}
            <button
              type="button"
              onClick={startSignup}
              className="w-full h-14 rounded-[14px] font-bold text-base text-black flex items-center justify-center gap-2 transition-all active:scale-95 bg-gradient-to-r from-primary to-orange-400 shadow-[0_8px_24px_rgba(255,95,31,0.35)]"
            >
              <Sparkles className="w-5 h-5" />
              Join & Get 15 Barber Bucks
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                already a member?
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Sign in — email OTP only */}
            <button
              type="button"
              onClick={() => setShowSignIn(true)}
              className="w-full h-12 rounded-[12px] font-semibold text-sm text-white/90 flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <Mail className="w-4 h-4" />
              Sign in with Email
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 w-full gap-2 pt-4 border-t border-white/10">
            <Stat value="50K+" label="Barbers" />
            <Stat value="180+" label="Countries" />
            <Stat value="$1M+" label="Awarded" />
          </div>
        </div>
      </div>

      <AuthModalV2
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        mode="signin"
      />
    </section>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-lg font-extrabold text-foreground">{value}</span>
    <span className="text-[10px] uppercase tracking-widest text-white/50">{label}</span>
  </div>
);

export default LandingHero;
