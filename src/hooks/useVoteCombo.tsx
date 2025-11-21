import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoteCombo {
  count: number;
  bonusEarned: number;
  lastVoteTime: number;
}

const COMBO_TIMEOUT = 30000; // 30 seconds
const COMBO_REWARDS: Record<number, { bb: number; message: string }> = {
  2: { bb: 5, message: '🔥 2x Combo! +5 BB' },
  5: { bb: 15, message: '⚡ 5x Combo! +15 BB' },
  10: { bb: 50, message: '💎 10x Combo! +50 BB' },
  20: { bb: 100, message: '🏆 20x LEGENDARY COMBO! +100 BB' }
};

export const useVoteCombo = (battleId: string, userId: string | undefined) => {
  const [combo, setCombo] = useState<VoteCombo>({ count: 0, bonusEarned: 0, lastVoteTime: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Reset combo after timeout
  useEffect(() => {
    if (combo.count > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setCombo({ count: 0, bonusEarned: 0, lastVoteTime: 0 });
        toast.info('Combo reset! Keep voting to build your streak.');
      }, COMBO_TIMEOUT);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [combo.count, combo.lastVoteTime]);

  // Increment combo on vote
  const incrementCombo = useCallback(async () => {
    if (!userId) return;

    const newCount = combo.count + 1;
    const now = Date.now();
    
    setCombo({
      count: newCount,
      bonusEarned: combo.bonusEarned,
      lastVoteTime: now
    });

    // Check for milestone rewards
    const reward = COMBO_REWARDS[newCount];
    if (reward) {
      try {
        // Update database with combo and bonus
        const { error } = await supabase
          .from('user_vote_combos')
          .upsert({
            user_id: userId,
            battle_id: battleId,
            combo_count: newCount,
            bonus_bb_earned: combo.bonusEarned + reward.bb,
            last_vote_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,battle_id'
          });

        if (error) throw error;

        // Update user's barber bucks
        const { data: profile } = await supabase
          .from('profiles')
          .select('barber_bucks')
          .eq('user_id', userId)
          .single();

        if (profile) {
          const { error: bbError } = await supabase
            .from('profiles')
            .update({ 
              barber_bucks: (profile.barber_bucks || 0) + reward.bb
            })
            .eq('user_id', userId);

          if (bbError) throw bbError;
        }

        setCombo(prev => ({
          ...prev,
          bonusEarned: prev.bonusEarned + reward.bb
        }));

        toast.success(reward.message, {
          duration: 3000,
          icon: newCount >= 10 ? '🏆' : '🔥'
        });
      } catch (error) {
        console.error('Error updating combo:', error);
      }
    }

    return newCount;
  }, [battleId, userId, combo]);

  // Fetch existing combo on mount
  useEffect(() => {
    const fetchCombo = async () => {
      if (!userId || !battleId) return;

      const { data } = await supabase
        .from('user_vote_combos')
        .select('*')
        .eq('user_id', userId)
        .eq('battle_id', battleId)
        .single();

      if (data) {
        const lastVote = new Date(data.last_vote_at).getTime();
        const timeSince = Date.now() - lastVote;

        // Only restore combo if within timeout window
        if (timeSince < COMBO_TIMEOUT) {
          setCombo({
            count: data.combo_count,
            bonusEarned: data.bonus_bb_earned,
            lastVoteTime: lastVote
          });
        }
      }
    };

    fetchCombo();
  }, [userId, battleId]);

  return {
    comboCount: combo.count,
    bonusEarned: combo.bonusEarned,
    incrementCombo
  };
};
