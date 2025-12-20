import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

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
      <div className="flex items-center justify-center gap-2 py-1 px-3 rounded-full bg-primary/20 border border-primary/30">
        <Flame className="w-3 h-3 text-primary" />
        <span className="text-[10px] text-white/80">Voted!</span>
      </div>
    );
  }

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
      
      {/* VS text */}
      <span className="text-primary font-bold text-xs">VS</span>
      
      {/* Vote button or choice */}
      {!showButtons ? (
        <motion.button
          onClick={() => setShowButtons(true)}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-[10px] text-white font-medium hover:bg-primary/30 transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <Flame className="w-3 h-3 text-primary" />
          Vote
        </motion.button>
      ) : (
        <div className="flex gap-1">
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => handleVote(1)}
            disabled={disabled}
            className="px-2 py-1 rounded-full bg-primary/30 border border-primary/50 text-[9px] text-white font-medium hover:bg-primary/50 transition-colors truncate max-w-[60px]"
            whileTap={{ scale: 0.95 }}
          >
            {barber1Name.split(' ')[0]}
          </motion.button>
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05 }}
            onClick={() => handleVote(2)}
            disabled={disabled}
            className="px-2 py-1 rounded-full bg-cyan/30 border border-cyan/50 text-[9px] text-white font-medium hover:bg-cyan/50 transition-colors truncate max-w-[60px]"
            whileTap={{ scale: 0.95 }}
          >
            {barber2Name.split(' ')[0]}
          </motion.button>
        </div>
      )}
    </div>
  );
};
