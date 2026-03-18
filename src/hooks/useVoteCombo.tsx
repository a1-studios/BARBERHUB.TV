import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoteCombo {
  count: number;
  lastVoteTime: number;
}

const COMBO_TIMEOUT = 30000; // 30 seconds
const COMBO_MESSAGES: Record<number, { message: string; icon: string }> = {
  2: { message: '🔥 2x Combo!', icon: '🔥' },
  5: { message: '⚡ 5x Combo!', icon: '⚡' },
  10: { message: '💎 10x Combo!', icon: '💎' },
  20: { message: '🏆 20x LEGENDARY COMBO!', icon: '🏆' }
};

export const useVoteCombo = (battleId: string, userId: string | undefined) => {
  const [combo, setCombo] = useState<VoteCombo>({ count: 0, lastVoteTime: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (combo.count > 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCombo({ count: 0, lastVoteTime: 0 });
        toast.info('Combo reset! Keep voting to build your streak.');
      }, COMBO_TIMEOUT);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [combo.count, combo.lastVoteTime]);

  const incrementCombo = useCallback(async () => {
    if (!userId) return;

    const newCount = combo.count + 1;
    setCombo({ count: newCount, lastVoteTime: Date.now() });

    // Save combo state
    await supabase
      .from('user_vote_combos')
      .upsert({
        user_id: userId,
        battle_id: battleId,
        combo_count: newCount,
        bonus_bb_earned: 0,
        last_vote_at: new Date().toISOString()
      }, { onConflict: 'user_id,battle_id' });

    // Show hype message at milestones
    const milestone = COMBO_MESSAGES[newCount];
    if (milestone) {
      toast.success(milestone.message, { duration: 3000, icon: milestone.icon });
    }

    return newCount;
  }, [battleId, userId, combo]);

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
        if (Date.now() - lastVote < COMBO_TIMEOUT) {
          setCombo({ count: data.combo_count, lastVoteTime: lastVote });
        }
      }
    };
    fetchCombo();
  }, [userId, battleId]);

  return {
    comboCount: combo.count,
    bonusEarned: 0,
    incrementCombo
  };
};
