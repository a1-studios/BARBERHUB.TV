import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Check } from 'lucide-react';

interface DesktopVoteButtonsProps {
  barber1Name: string;
  barber2Name: string;
  onVote: (choice: 1 | 2) => void;
  disabled?: boolean;
}

export const DesktopVoteButtons = ({
  barber1Name,
  barber2Name,
  onVote,
  disabled = false
}: DesktopVoteButtonsProps) => {
  const [hasVoted, setHasVoted] = useState<1 | 2 | null>(null);

  const handleVote = (choice: 1 | 2) => {
    if (disabled || hasVoted) return;
    setHasVoted(choice);
    onVote(choice);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Barber 1 Vote Button */}
      <motion.button
        onClick={() => handleVote(1)}
        disabled={disabled || hasVoted !== null}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          hasVoted === 1 
            ? 'bg-primary/60 border-2 border-primary text-white shadow-lg shadow-primary/30' 
            : hasVoted === 2
            ? 'bg-muted/20 border border-muted/30 text-muted-foreground opacity-40'
            : 'bg-primary/20 border border-primary/50 text-white hover:bg-primary/40 hover:scale-105'
        }`}
        whileTap={!hasVoted ? { scale: 0.95 } : {}}
        animate={hasVoted === 1 ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {hasVoted === 1 ? (
          <Check className="w-4 h-4 text-white" />
        ) : (
          <Flame className="w-4 h-4 text-primary" />
        )}
        <span>Vote {barber1Name}</span>
      </motion.button>

      {/* Barber 2 Vote Button */}
      <motion.button
        onClick={() => handleVote(2)}
        disabled={disabled || hasVoted !== null}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          hasVoted === 2 
            ? 'bg-cyan/60 border-2 border-cyan text-white shadow-lg shadow-cyan/30' 
            : hasVoted === 1
            ? 'bg-muted/20 border border-muted/30 text-muted-foreground opacity-40'
            : 'bg-cyan/20 border border-cyan/50 text-white hover:bg-cyan/40 hover:scale-105'
        }`}
        whileTap={!hasVoted ? { scale: 0.95 } : {}}
        animate={hasVoted === 2 ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <span>Vote {barber2Name}</span>
        {hasVoted === 2 ? (
          <Check className="w-4 h-4 text-white" />
        ) : (
          <Flame className="w-4 h-4 text-cyan" />
        )}
      </motion.button>
    </div>
  );
};
