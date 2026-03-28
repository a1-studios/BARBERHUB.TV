import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * ChallengerFoundOverlay — Full-screen cinematic takeover
 * Triggered by Supabase Realtime on notifications table when type = 'battle_match'.
 * Auto-dismisses after 8 seconds or on tap.
 */
export const ChallengerFoundOverlay = () => {
  const { user } = useAuth();
  const [matchData, setMatchData] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('match-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as any;
          if (notification.type === 'battle_match') {
            setMatchData(notification.data);
            setVisible(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center"
          onClick={() => setVisible(false)}
        >
          <button
            onClick={() => setVisible(false)}
            className="absolute top-6 right-6 text-white/60 hover:text-white z-10"
          >
            <X className="w-8 h-8" />
          </button>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-center space-y-8"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Swords className="w-24 h-24 text-red-500 mx-auto" />
            </motion.div>

            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-5xl md:text-7xl font-black text-white tracking-tight"
            >
              CHALLENGER FOUND
            </motion.h1>

            {matchData?.opponent_name && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <p className="text-2xl text-white/80">Your opponent:</p>
                <p className="text-4xl font-bold text-red-400">
                  {matchData.opponent_name}
                </p>
                {matchData.opponent_country && (
                  <p className="text-lg text-white/60">
                    {String.fromCodePoint(
                      ...[...matchData.opponent_country.toUpperCase()].map(
                        (c: string) => 127397 + c.charCodeAt(0)
                      )
                    )}{' '}
                    {matchData.opponent_country.toUpperCase()}
                  </p>
                )}
              </motion.div>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-lg text-white/40"
            >
              Tap anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
