import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Check } from 'lucide-react';

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

  const handleVote = (choice: 1 | 2) => {
    if (disabled || hasVoted) return;
    setHasVoted(choice);
    onVote(choice);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Live indicator dot */}
      {isLive && (
        <motion.div
          className="w-2 h-2 bg-red-500 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      
      {/* Barber 1 Vote Button */}
      <motion.button
        onClick={() => handleVote(1)}
        disabled={disabled || hasVoted !== null}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-medium transition-all truncate max-w-[70px] ${
          hasVoted === 1 
            ? 'bg-primary/50 border border-primary text-white' 
            : hasVoted === 2
            ? 'bg-muted/30 border border-muted/50 text-muted-foreground opacity-50'
            : 'bg-primary/20 border border-primary/40 text-white hover:bg-primary/40'
        }`}
        whileTap={!hasVoted ? { scale: 0.9 } : {}}
        animate={hasVoted === 1 ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {hasVoted === 1 ? (
          <Check className="w-3 h-3 text-white" />
        ) : (
          <Flame className="w-3 h-3 text-primary" />
        )}
        <span className="truncate">{barber1Name.split(' ')[0]}</span>
      </motion.button>

      {/* VS text */}
      <span className="text-primary/60 font-bold text-[10px]">VS</span>
      
      {/* Barber 2 Vote Button */}
      <motion.button
        onClick={() => handleVote(2)}
        disabled={disabled || hasVoted !== null}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-medium transition-all truncate max-w-[70px] ${
          hasVoted === 2 
            ? 'bg-cyan/50 border border-cyan text-white' 
            : hasVoted === 1
            ? 'bg-muted/30 border border-muted/50 text-muted-foreground opacity-50'
            : 'bg-cyan/20 border border-cyan/40 text-white hover:bg-cyan/40'
        }`}
        whileTap={!hasVoted ? { scale: 0.9 } : {}}
        animate={hasVoted === 2 ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <span className="truncate">{barber2Name.split(' ')[0]}</span>
        {hasVoted === 2 ? (
          <Check className="w-3 h-3 text-white" />
        ) : (
          <Flame className="w-3 h-3 text-cyan" />
        )}
      </motion.button>
    </div>
  );
};
