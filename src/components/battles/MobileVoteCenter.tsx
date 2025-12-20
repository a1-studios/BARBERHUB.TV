import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileVoteCenterProps {
  barber1Name: string;
  barber2Name: string;
  onVote: (choice: 1 | 2) => void;
  isLive?: boolean;
  disabled?: boolean;
}

export const MobileVoteCenter = ({
  barber1Name,
  barber2Name,
  onVote,
  isLive = false,
  disabled = false
}: MobileVoteCenterProps) => {
  const [hasVoted, setHasVoted] = useState<1 | 2 | null>(null);
  const [showButtons, setShowButtons] = useState(false);

  const handleVote = (choice: 1 | 2) => {
    if (disabled || hasVoted) return;
    setHasVoted(choice);
    onVote(choice);
  };

  if (hasVoted) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-primary/30 overflow-hidden"
      >
        {/* Animated border */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{
              background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(187 100% 50%), hsl(var(--primary)), hsl(187 100% 50%), hsl(var(--primary)))",
              filter: "blur(8px)",
              opacity: 0.3,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-2">
          <Flame className="w-6 h-6 text-primary" />
          <span className="text-white font-bold text-sm">Vote Recorded!</span>
          <span className="text-xs text-muted-foreground">
            You voted for {hasVoted === 1 ? barber1Name : barber2Name}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative p-3 rounded-2xl bg-background/80 backdrop-blur-md overflow-hidden"
    >
      {/* Animated energy border */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <motion.div
          className="absolute -inset-1"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              hsl(var(--primary)) 0px,
              hsl(var(--primary)) 10px,
              transparent 10px,
              transparent 20px,
              hsl(187 100% 50%) 20px,
              hsl(187 100% 50%) 30px,
              transparent 30px,
              transparent 40px
            )`,
          }}
          animate={{ x: [0, -40] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      {/* Inner background */}
      <div className="absolute inset-[3px] rounded-xl bg-background/95" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        {/* VS and Live Badge Row */}
        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/50">
              <motion.div
                className="w-2 h-2 bg-red-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <Radio className="w-3 h-3 text-red-500" />
              <span className="text-[10px] font-bold text-red-500 uppercase">Live</span>
            </div>
          )}
          
          <div className="px-4 py-1.5 rounded-lg bg-black/80 border-2 border-cyan/50 shadow-lg shadow-cyan/20">
            <span className="text-primary font-black text-lg tracking-wider">VS</span>
          </div>
        </div>

        {/* Vote Button or Choice Buttons */}
        {!showButtons ? (
          <Button
            onClick={() => setShowButtons(true)}
            disabled={disabled}
            className="relative px-8 py-3 bg-gradient-to-r from-primary via-orange-500 to-primary text-white font-bold rounded-full shadow-lg shadow-primary/30 border-2 border-white/20 overflow-hidden group"
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="relative flex items-center gap-2">
              <Flame className="w-5 h-5" />
              Cast Your Vote
            </span>
          </Button>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex gap-3 w-full"
          >
            <Button
              onClick={() => handleVote(1)}
              disabled={disabled}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-primary/30 border border-primary/50 hover:scale-105 transition-transform"
            >
              <span className="truncate text-xs">{barber1Name}</span>
            </Button>
            
            <Button
              onClick={() => handleVote(2)}
              disabled={disabled}
              className="flex-1 py-3 bg-gradient-to-r from-cyan to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan/30 border border-cyan/50 hover:scale-105 transition-transform"
            >
              <span className="truncate text-xs">{barber2Name}</span>
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
