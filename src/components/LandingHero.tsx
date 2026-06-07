import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { AuthModalV2 } from "@/components/auth/AuthModalV2";
import barberPole from "@/assets/barber-pole.png";

interface LandingHeroProps {
  onStartSignup?: () => void;
  onOpenArenaGate?: () => void;
}

const LandingHero = (_props: LandingHeroProps) => {
  const [searchParams] = useSearchParams();
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signup");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "signup" || tab === "signin") {
      setMode(tab);
      setAuthOpen(true);
    }
  }, [searchParams]);

  const open = (m: "signup" | "signin") => {
    setMode(m);
    setAuthOpen(true);
  };

  return (
    <section className="relative min-h-[100svh] w-full flex flex-col px-3 pt-2 pb-10 overflow-hidden bg-background">
      {/* Signature Header */}
      <header className="relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2 border-primary/40 rounded-xl overflow-hidden mx-auto w-full max-w-md">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-0">
          <div className="absolute w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl animate-pulse" />
        </div>
        <div className="relative z-10 px-4 flex items-center justify-between h-12 md:h-14">
          <img src={barberPole} alt="BARBER-HUB Logo" className="h-9 w-9 md:h-10 md:w-10" />
          <span className="text-lg md:text-xl font-black tracking-[0.18em] uppercase">
            <span className="text-white">BARBER</span>
            <span className="text-primary">-HUB</span>
          </span>
          <div className="w-9" />
        </div>
      </header>

      <div className="relative flex-1 flex items-center justify-center w-full max-w-md mx-auto pt-6">
        <div className="flex flex-col items-center gap-8 text-center w-full">
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

          {/* Simple auth card */}
          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={() => open("signup")}
              className="w-full h-14 rounded-[14px] font-bold text-base text-black flex items-center justify-center gap-2 transition-all active:scale-95 bg-gradient-to-r from-primary to-orange-400 shadow-[0_8px_24px_rgba(255,95,31,0.35)]"
            >
              <Mail className="w-5 h-5" />
              Sign up — Get your code
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                already a member?
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              type="button"
              onClick={() => open("signin")}
              className="w-full h-12 rounded-[12px] font-semibold text-sm text-white/90 flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              Sign in
            </button>
          </div>

          <div className="grid grid-cols-3 w-full gap-2 pt-4 border-t border-white/10">
            <Stat value="50K+" label="Barbers" />
            <Stat value="180+" label="Countries" />
            <Stat value="$1M+" label="Awarded" />
          </div>
        </div>
      </div>

      <AuthModalV2
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        mode={mode}
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
