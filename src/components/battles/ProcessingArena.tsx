import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProcessingArenaProps {
  battleId: string;
  onReady: () => void;
}

/**
 * ProcessingArena — Shown when battle.status === 'processing'
 * Animated "Generating Replay..." state with Realtime subscription
 * that auto-transitions to VOD playback when status changes to 'voting'.
 */
export const ProcessingArena = ({ battleId, onReady }: ProcessingArenaProps) => {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Watch for status change
  useEffect(() => {
    const channel = supabase
      .channel(`processing-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          if (newStatus === 'voting' || newStatus === 'completed') {
            onReady();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [battleId, onReady]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-40">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 mx-auto"
        >
          <Loader2 className="w-20 h-20 text-primary" />
        </motion.div>

        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Generating Replay{dots}
          </h2>
          <p className="text-white/60 text-lg">
            The battle recording is being finalized
          </p>
        </div>

        <motion.div
          className="w-64 h-1 bg-white/10 rounded-full mx-auto overflow-hidden"
        >
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '40%' }}
          />
        </motion.div>

        <p className="text-white/30 text-sm">
          This usually takes 1-3 minutes
        </p>
      </motion.div>
    </div>
  );
};
