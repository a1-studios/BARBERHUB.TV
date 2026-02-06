import { motion } from "framer-motion";

interface NationBannerProps {
  countryCode: string;
  barberName: string;
  side: "left" | "right";
  isActive?: boolean;
}

export const NationBanner = ({
  countryCode,
  barberName,
  side,
  isActive = false,
}: NationBannerProps) => {
  const flagUrl = countryCode
    ? `https://flagcdn.com/w640/${countryCode.toLowerCase()}.jpg`
    : "";

  return (
    <div className="hidden sm:flex relative w-14 sm:w-16 lg:w-20 flex-shrink-0 h-full">
      {/* Banner body with shield-pointed bottom */}
      <div
        className="relative w-full h-full overflow-hidden border-2 border-primary/60"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)",
        }}
      >
        {/* Dark inner body */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 to-background/80" />

        {/* Flag image - desaturated */}
        {flagUrl && (
          <div
            className="absolute inset-0 brightness-[0.7] saturate-[0.8]"
            style={{
              backgroundImage: `url(${flagUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Orange frame glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 15px hsl(var(--primary) / 0.3)",
          }}
        />

        {/* Barber name - vertical text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="text-white font-bold text-[10px] lg:text-xs tracking-widest uppercase whitespace-nowrap"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: side === "left" ? "rotate(180deg)" : "none",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {barberName}
          </span>
        </div>

        {/* Cyan energy glow at bottom point - active battles only */}
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-12 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center bottom, hsl(187 100% 50% / 0.5) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* External orange glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)",
          boxShadow: isActive
            ? "0 0 20px hsl(var(--primary) / 0.4)"
            : "0 0 10px hsl(var(--primary) / 0.2)",
        }}
      />
    </div>
  );
};
