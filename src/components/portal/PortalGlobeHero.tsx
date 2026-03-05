import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Globe3D from "@/components/Globe3D";
import { LiveMatchCounter } from "@/components/tournament/LiveMatchCounter";
import { useCategoryPrizePools } from "@/hooks/useCategoryPrizePools";

const tickerItems = [
  "🏆 Prize Pool: $25,000+ and growing",
  "⚔️ Next Battle: Sunday 10AM EST",
  "🌍 127 Barbers Registered Worldwide",
  "🇺🇸 USA leads with 34 wins",
  "🔥 5 Categories — Speed Fade, Gentleman's Cut, Creative Color & more",
  "💈 Top 25 qualify for the Grand Final",
];

export const PortalGlobeHero = () => {
  const [tickerIndex, setTickerIndex] = useState(0);
  const { totalPrizePool, isLoading: prizeLoading } = useCategoryPrizePools();

  const totalDollars = totalPrizePool / 100;
  const bbEquivalent = totalDollars * 5;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatBB = (value: number) =>
    new Intl.NumberFormat('en-US').format(value);

  const dynamicTickerItems = [
    `🏆 Prize Pool: ${prizeLoading ? '$25,000+' : formatCurrency(totalDollars)} (${prizeLoading ? '125,000' : formatBB(bbEquivalent)} BB)`,
    ...tickerItems.slice(1),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl mt-8 mb-10" style={{ height: 350 }}>
      {/* Conic gradient energy border */}
      <div
        className="absolute -inset-[2px] rounded-2xl pointer-events-none z-0"
        style={{
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            hsl(24 100% 52% / 0.5) 45deg,
            transparent 90deg,
            hsl(187 100% 50% / 0.4) 135deg,
            transparent 180deg,
            hsl(24 100% 52% / 0.5) 225deg,
            transparent 270deg,
            hsl(187 100% 50% / 0.4) 315deg,
            transparent 360deg
          )`,
          animation: "spin-slow 20s linear infinite",
        }}
      />

      {/* Inner background */}
      <div className="absolute inset-[2px] rounded-2xl bg-background z-[1]" />

      {/* 3D Globe */}
      <div className="absolute inset-0 z-[2]">
        <Globe3D rotationSpeed={2} dotCount={20} opacity={0.5} />
      </div>

      {/* Scanning line effect */}
      <div className="absolute inset-0 z-[3] overflow-hidden rounded-2xl pointer-events-none">
        <div
          className="absolute w-full"
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, hsl(187 100% 50% / 0.5) 20%, hsl(187 100% 50% / 0.8) 50%, hsl(187 100% 50% / 0.5) 80%, transparent 100%)`,
            boxShadow: "0 0 20px hsl(187 100% 50% / 0.4)",
            animation: "scan-vertical 4s ease-in-out infinite",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + Math.random() * 4,
              height: 4 + Math.random() * 4,
              left: `${15 + Math.random() * 70}%`,
              top: `${15 + Math.random() * 70}%`,
              background: i % 2 === 0 ? "hsl(24 100% 52% / 0.8)" : "hsl(187 100% 50% / 0.8)",
              boxShadow: i % 2 === 0 ? "0 0 10px hsl(24 100% 52% / 0.6)" : "0 0 10px hsl(187 100% 50% / 0.6)",
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              animation: `float-particle ${3 + Math.random() * 2}s ease-in-out ${i * 0.5}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Gradient vignette overlay */}
      <div
        className="absolute inset-0 z-[4] pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, hsl(var(--background)) 85%)`,
        }}
      />

      {/* Content overlay */}
      <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-center px-4">
        {/* Emoji Row */}
        <div className="text-2xl sm:text-3xl mb-3 tracking-[0.3em]">
          🏆🔥⚔️🔥🏆
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight leading-tight mb-3">
          <span className="text-foreground">2026</span>{" "}
          <span className="text-primary tracking-wide">GLOBAL</span>{" "}
          <span className="text-foreground">CHAMPIONSHIP</span>
        </h1>

        {/* Prize Pool Display */}
        <div className="flex flex-col items-center mb-2">
          <motion.span
            key={`usd-${totalDollars}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-orange-400 to-primary bg-clip-text text-transparent"
          >
            {prizeLoading ? '...' : formatCurrency(totalDollars)}
          </motion.span>
          <motion.span
            key={`bb-${bbEquivalent}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm sm:text-base font-semibold bg-gradient-to-r from-primary to-[hsl(187_100%_50%)] bg-clip-text text-transparent"
          >
            {prizeLoading ? '...' : `≈ ${formatBB(bbEquivalent)} BB`}
          </motion.span>
        </div>

        <LiveMatchCounter />

        {/* Live dot + subtitle */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
          <p className="text-sm sm:text-base">
            <span className="text-primary font-semibold">Live battles</span>{" "}
            <span className="text-muted-foreground">every Sunday, 10:00 AM - 6:00 PM EST</span>
          </p>
        </div>
      </div>

      {/* Bottom ticker */}
      <div className="absolute bottom-0 left-0 right-0 z-[6] bg-background/70 backdrop-blur-sm border-t border-primary/20 px-4 py-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={tickerIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-center text-sm font-medium text-foreground"
          >
            {dynamicTickerItems[tickerIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes scan-vertical {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.8; }
          25% { transform: translateY(-20px) translateX(10px) scale(1.2); opacity: 1; }
          50% { transform: translateY(-10px) translateX(-10px) scale(0.8); opacity: 0.6; }
          75% { transform: translateY(-30px) translateX(5px) scale(1.1); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};
