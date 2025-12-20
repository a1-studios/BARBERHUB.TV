import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Trophy } from "lucide-react";
import { useCategoryPrizePools } from "@/hooks/useCategoryPrizePools";

const WorldCupPrizeCounter = () => {
  const { totalPrizePool, isLoading } = useCategoryPrizePools();
  const [displayValue, setDisplayValue] = useState(0);
  
  // Convert cents to dollars
  const totalDollars = totalPrizePool / 100;
  
  // Spring animation for smooth counting
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
      className="relative flex flex-col items-center justify-center"
    >
      {/* Outer energy ring */}
      <div className="absolute inset-0 -m-4">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(187 100% 50%), hsl(var(--primary)), hsl(187 100% 50%), hsl(var(--primary)))",
            filter: "blur(8px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      {/* Inner glow pulse */}
      <motion.div
        className="absolute inset-0 -m-2 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
        }}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Main container */}
      <div className="relative z-10 flex flex-col items-center px-6 py-4 rounded-2xl bg-background/80 backdrop-blur-md border border-primary/30">
        {/* Trophy icon with energy */}
        <div className="relative mb-2">
          {/* Energy particles around trophy */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: i % 2 === 0 ? "hsl(var(--primary))" : "hsl(187 100% 50%)",
                left: "50%",
                top: "50%",
              }}
              animate={{
                x: [0, Math.cos((i * 60 * Math.PI) / 180) * 25],
                y: [0, Math.sin((i * 60 * Math.PI) / 180) * 25],
                opacity: [1, 0],
                scale: [1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut",
              }}
            />
          ))}
          
          {/* Trophy with glow */}
          <motion.div
            className="relative"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 blur-md bg-primary/50 rounded-full" />
            <Trophy className="relative w-8 h-8 text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]" />
          </motion.div>
        </div>
        
        {/* "TOTAL PRIZE POOL" label */}
        <motion.div
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Total Prize Pool
        </motion.div>
        
        {/* Animated price display */}
        <div className="relative">
          {/* Scanning highlight effect */}
          <motion.div
            className="absolute inset-0 w-full h-full"
            style={{
              background: "linear-gradient(90deg, transparent 0%, hsl(187 100% 50% / 0.3) 50%, transparent 100%)",
            }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
          />
          
          <motion.span
            className="relative text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-[hsl(187_100%_50%)] to-primary bg-clip-text text-transparent"
            style={{
              textShadow: "0 0 30px hsl(var(--primary) / 0.5)",
            }}
          >
            {isLoading ? "..." : formatCurrency(displayValue)}
          </motion.span>
        </div>
        
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 mt-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-500"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
        </div>
      </div>
      
      {/* Bottom energy beam */}
      <motion.div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(187 100% 50%), hsl(var(--primary)), transparent)",
        }}
        animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
};

export default WorldCupPrizeCounter;
