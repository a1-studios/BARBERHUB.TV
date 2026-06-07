import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
      className="relative h-[100svh] w-full flex flex-col px-4 pt-2 overflow-hidden bg-background"
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
        {/* Neon gradient-bordered auth box — 1:1 ratio */}
        <div className="w-full relative">
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
            className="relative w-full rounded-[20px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.3) 40%, hsl(var(--cyan) / 0.3) 60%, hsl(var(--cyan)) 100%)",
            }}
          >
            <div className="w-full rounded-[19px] bg-background/85 backdrop-blur-xl p-5 flex flex-col justify-center gap-4">
              <label className="block">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/70">
                  Email or Phone
                </span>
                {/* Input pill */}
                <div
                  className="mt-1.5 rounded-full p-[1px]"
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
                    placeholder="you@example.com  or  +1 555…"
                    className="w-full h-11 rounded-full bg-background/80 px-4 text-sm text-foreground placeholder:text-foreground/30 outline-none"
                    inputMode="email"
                    autoComplete="email"
                  />
                </div>
              </label>

              {/* Sign Up button */}
              <button
                type="button"
                onClick={() => open("signup")}
                className="group relative w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-base tracking-wide uppercase transition-all duration-300 active:scale-[0.98] border border-primary hover:text-cyan hover:bg-primary/90"
                style={{
                  boxShadow:
                    "0 0 0 1px hsl(var(--primary) / 0.5), 0 0 18px hsl(var(--primary) / 0.45)",
                }}
              >
                Sign Up
              </button>

              {/* Log In link */}
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

export default LandingHero;
