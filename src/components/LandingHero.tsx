import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthModalV2 } from "@/components/auth/AuthModalV2";
import barberPole from "@/assets/barber-pole.png";
import { Scissors, Crown, Trophy, Sparkles } from "lucide-react";

interface LandingHeroProps {
  onStartSignup?: () => void;
  onOpenArenaGate?: () => void;
}

const LandingHero = (_props: LandingHeroProps) => {
  const [searchParams] = useSearchParams();
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [identity, setIdentity] = useState("");

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
    <section
      className="fixed inset-0 h-[100svh] w-full flex flex-col px-4 pt-2 overflow-hidden overscroll-none touch-none bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Signature Header (unchanged) */}
      <header className="relative bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2 border-primary/40 rounded-xl overflow-hidden mx-auto w-full max-w-md shrink-0">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-0">
          <div className="absolute w-32 h-32 bg-cyan/20 rounded-full blur-2xl animate-pulse" />
        </div>
        <div className="relative z-10 px-4 flex items-center justify-between h-12 md:h-14">
          <img src={barberPole} alt="BARBER-HUB Logo" className="h-9 w-9 md:h-10 md:w-10" />
          <span className="text-lg md:text-xl font-black tracking-[0.18em] uppercase">
            <span className="text-foreground">BARBER</span>
            <span className="text-primary">-HUB</span>
          </span>
          <div className="w-9" />
        </div>
      </header>

      {/* Main column */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto gap-4 py-4 min-h-0">
        {/* Neon gradient-bordered auth box — 4:5 portrait ratio */}
        <div className="w-[88%] max-w-[360px] relative" style={{ aspectRatio: "4 / 5" }}>
          {/* Outer glow */}
          <div
            aria-hidden
            className="absolute -inset-2 rounded-[22px] opacity-60 blur-xl pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--primary) / 0.45), transparent 45%, transparent 55%, hsl(var(--cyan) / 0.45))",
            }}
          />
          {/* Gradient border wrapper */}
          <div
            className="relative h-full w-full rounded-[20px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.3) 40%, hsl(var(--cyan) / 0.3) 60%, hsl(var(--cyan)) 100%)",
            }}
          >
            <div className="relative h-full w-full rounded-[19px] bg-background/85 backdrop-blur-xl px-5 py-5 flex flex-col justify-between overflow-hidden">
              {/* Decorative corner icons */}
              <Scissors aria-hidden className="absolute top-2 left-2 h-3.5 w-3.5 text-primary/40" />
              <Crown aria-hidden className="absolute top-2 right-2 h-3.5 w-3.5 text-cyan/40" />
              <Trophy aria-hidden className="absolute bottom-2 left-2 h-3.5 w-3.5 text-cyan/40" />
              <Sparkles aria-hidden className="absolute bottom-2 right-2 h-3.5 w-3.5 text-primary/40" />

              {/* Top: icon row */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/40" />
                <img src={barberPole} alt="" className="h-6 w-6 opacity-90" />
                <Scissors className="h-[18px] w-[18px] text-primary" />
                <Crown className="h-[18px] w-[18px] text-cyan" />
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan/40" />
              </div>

              {/* Feature pills row */}
              <div className="flex items-center justify-around px-1">
                <FeaturePill icon={<Trophy className="h-3 w-3 text-primary" />} label="Battle" />
                <FeaturePill icon={<Sparkles className="h-3 w-3 text-cyan" />} label="Vote" />
                <FeaturePill icon={<Crown className="h-3 w-3 text-primary" />} label="Earn" />
              </div>

              {/* Sign Up button (moved up) */}
              <button
                type="button"
                onClick={() => open("signup")}
                className="group relative w-full h-11 rounded-full bg-primary text-primary-foreground font-bold text-base tracking-wide uppercase transition-all duration-300 active:scale-[0.98] border border-primary hover:text-cyan hover:bg-primary/90"
                style={{
                  boxShadow:
                    "0 0 0 1px hsl(var(--primary) / 0.5), 0 0 18px hsl(var(--primary) / 0.45)",
                }}
              >
                Sign Up
              </button>

              {/* Email/Phone input (no external label, moved down) */}
              <div
                className="rounded-full p-[1px]"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--primary) / 0.7), hsl(var(--cyan) / 0.7))",
                }}
              >
                <input
                  type="text"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && open("signup")}
                  placeholder="Email or phone"
                  className="w-full h-10 rounded-full bg-background/80 px-4 text-sm text-foreground placeholder:text-foreground/40 outline-none text-center"
                  inputMode="email"
                  autoComplete="email"
                />
              </div>

              {/* Bottom: log in link */}
              <p className="text-center text-xs text-foreground/60">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => open("signin")}
                  className="text-cyan font-semibold hover:underline"
                >
                  Log In
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Title UNDER the box */}
        <h1 className="text-center text-2xl sm:text-3xl font-black uppercase tracking-tight leading-[1.05]">
          <span className="text-foreground">WHERE</span>{" "}
          <span className="text-primary">BARBER</span>
          <br />
          <span className="text-primary">BECOME</span>{" "}
          <span className="text-foreground">LEGENDS</span>
        </h1>

        {/* Slogan under the title */}
        <p className="text-center text-xs text-muted-foreground px-6 max-w-xs">
          Battle. Vote. Earn. The world's first barber competition platform.
        </p>
      </div>

      {/* Stats bottom */}
      <div className="shrink-0 grid grid-cols-3 w-full max-w-md mx-auto gap-2 pb-3">
        <Stat value="50K+" label="Barbers" />
        <Stat value="180+" label="Countries" />
        <Stat value="$1M+" label="Awarded" />
      </div>

      <AuthModalV2
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        mode={mode}
        prefillIdentity={identity}
      />
    </section>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-base font-extrabold text-foreground">{value}</span>
    <span className="text-[9px] uppercase tracking-widest text-foreground/50">{label}</span>
  </div>
);

const FeaturePill = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/5 border border-foreground/10">
    {icon}
    <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground/70">{label}</span>
  </div>
);

export default LandingHero;
