import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  timestamp: number;
}

const EMOJIS = ['🔥', '❤️', '😱', '💯', '✂️', '👏', '🎉', '🤩'];
const MAX_REACTIONS = 50;

interface FloatingReactionsProps {
  battleId: string;
  barberId?: string;
}

export const FloatingReactions = ({ battleId, barberId }: FloatingReactionsProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    // Subscribe to new reactions
    const channel = supabase
      .channel(`battle-reactions-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_reactions',
          filter: barberId ? `barber_id=eq.${barberId}` : `battle_id=eq.${battleId}`
        },
        (payload: any) => {
          const newReaction: Reaction = {
            id: payload.new.id,
            emoji: payload.new.emoji,
            x: Math.random() * 80 + 10, // Random position 10-90%
            timestamp: Date.now()
          };

          setReactions(prev => {
            const updated = [...prev, newReaction];
            // Keep only last MAX_REACTIONS
            return updated.slice(-MAX_REACTIONS);
          });

          // Auto-remove after animation
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== newReaction.id));
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, barberId]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ 
              y: '100vh', 
              x: `${reaction.x}vw`,
              opacity: 1,
              scale: 0.5
            }}
            animate={{ 
              y: '-10vh',
              scale: 1
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 3,
              ease: 'easeOut'
            }}
            className="absolute text-4xl"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ReactionPickerProps {
  battleId: string;
  barberId?: string;
  userId: string;
  onReactionSent?: () => void;
}

export const ReactionPicker = ({ battleId, barberId, userId, onReactionSent }: ReactionPickerProps) => {
  const sendReaction = async (emoji: string) => {
    try {
      await supabase.from('battle_reactions').insert({
        battle_id: battleId,
        user_id: userId,
        barber_id: barberId,
        emoji
      });
      
      onReactionSent?.();
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  return (
    <div className="flex gap-2 justify-center py-3 bg-background/80 backdrop-blur-sm rounded-full px-4">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => sendReaction(emoji)}
          className="text-2xl hover:scale-125 transition-transform active:scale-95"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
