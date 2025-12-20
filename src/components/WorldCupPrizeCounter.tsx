import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Trophy } from "lucide-react";
import { useCategoryPrizePools } from "@/hooks/useCategoryPrizePools";

const WorldCupPrizeCounter = () => {
  const { totalPrizePool, isLoading } = useCategoryPrizePools();
  const [displayValue, setDisplayValue] = useState(0);
  
  const totalDollars = totalPrizePool / 100;
  
  const springValue = useSpring(0, { stiffness: 50, damping: 20 });
  const animatedValue = useTransform(springValue, (val) => Math.floor(val));
  
  useEffect(() => {
    springValue.set(totalDollars);
  }, [totalDollars, springValue]);
  
  useEffect(() => {
    const unsubscribe = animatedValue.on("change", (val) => {
      setDisplayValue(val);
    });
    return () => unsubscribe();
  }, [animatedValue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative flex items-center justify-center"
    >
      {/* Sideways Barber Pole Frame - Wide horizontal layout */}
      <div className="relative flex items-center">
        
        {/* Left Energy Sphere */}
        <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 z-20">
          {/* Inner sphere */}
          <motion.div
            className="absolute inset-0 rounded-full bg-background/90 backdrop-blur-sm border border-primary/40"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Core energy */}
          <motion.div
            className="absolute inset-2 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.3) 60%, transparent 100%)",
            }}
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Energy particles */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`left-${i}`}
              className="absolute w-1 h-1 rounded-full bg-primary"
              style={{ left: "50%", top: "50%" }}
              animate={{
                x: [0, Math.cos((i * 90 * Math.PI) / 180) * 16, 0],
                y: [0, Math.sin((i * 90 * Math.PI) / 180) * 16, 0],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>

        {/* Main Pole Body - Wide horizontal cylinder */}
        <div className="relative h-12 md:h-14 w-[200px] sm:w-[280px] md:w-[340px] -mx-3 overflow-hidden rounded-lg">
          {/* Animated stripes background */}
          <motion.div
            className="absolute inset-0 w-[200%] h-full"
            style={{
              background: `repeating-linear-gradient(
                -30deg,
                hsl(var(--primary)) 0px,
                hsl(var(--primary)) 15px,
                hsl(var(--background)) 15px,
                hsl(var(--background)) 30px,
                hsl(187 100% 50%) 30px,
                hsl(187 100% 50%) 45px,
                hsl(var(--background)) 45px,
                hsl(var(--background)) 60px
              )`,
            }}
            animate={{ x: [0, -60] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Glossy overlay for 3D cylinder effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30" />
          
          {/* Center content overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Trophy */}
              <motion.div
                className="relative"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="absolute inset-0 blur-md bg-primary/50 rounded-full" />
                <Trophy className="relative w-6 h-6 md:w-7 md:h-7 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" />
              </motion.div>
              
              {/* Prize info */}
              <div className="flex flex-col items-center">
                <motion.span
                  className="text-[8px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Total Prize Pool
                </motion.span>
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, hsl(187 100% 50% / 0.4) 50%, transparent 100%)",
                    }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
                  />
                  <span className="relative text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-[hsl(187_100%_50%)] to-primary bg-clip-text text-transparent">
                    {isLoading ? "..." : formatCurrency(displayValue)}
                  </span>
                </div>
              </div>
              
              {/* Live indicator */}
              <div className="flex items-center gap-1">
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
              </div>
            </div>
          </div>
          
          {/* Top edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          {/* Bottom edge shadow */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[hsl(187_100%_50%)]/40 to-transparent" />
        </div>

        <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 z-20">
          {/* Inner sphere */}
          <motion.div
            className="absolute inset-0 rounded-full bg-background/90 backdrop-blur-sm border border-[hsl(187_100%_50%)]/40"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          {/* Core energy */}
          <motion.div
            className="absolute inset-2 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(187 100% 50%) 0%, hsl(187 100% 50% / 0.3) 60%, transparent 100%)",
            }}
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          {/* Energy particles */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`right-${i}`}
              className="absolute w-1 h-1 rounded-full bg-[hsl(187_100%_50%)]"
              style={{ left: "50%", top: "50%" }}
              animate={{
                x: [0, Math.cos((i * 90 * Math.PI) / 180) * 16, 0],
                y: [0, Math.sin((i * 90 * Math.PI) / 180) * 16, 0],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 + 0.5 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default WorldCupPrizeCounter;
