import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Radio } from 'lucide-react';
import { LiveCommentStream } from './LiveCommentStream';
import { FanActionBar } from './FanActionBar';
import { Button } from '@/components/ui/button';

interface FanTerminalProps {
  battleId: string;
  barber1: { userId: string; profileId: string; name: string };
  barber2: { userId: string; profileId: string; name: string };
  isMobile: boolean;
  fanCount?: number;
}

export const FanTerminal = ({ battleId, barber1, barber2, isMobile, fanCount = 0 }: FanTerminalProps) => {
  const [expanded, setExpanded] = useState(!isMobile);

  return (
    <div className="lobby-ui-interactive pointer-events-auto absolute inset-x-0 bottom-0 z-20 px-2 pb-2 sm:px-4 sm:pb-4">
      <div className="mx-auto w-full max-w-md">
        {isMobile && !expanded && (
          <Button
            onClick={() => setExpanded(true)}
            className="w-full h-10 rounded-t-2xl rounded-b-none bg-black/70 backdrop-blur-xl border border-cyan-400/30 ring-1 ring-cyan-400/20 text-cyan-300 text-xs font-bold uppercase tracking-widest hover:bg-black/80"
          >
            <ChevronUp className="mr-2 h-4 w-4" />
            Open Arena Chat
          </Button>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-2xl ring-1 ring-cyan-400/30 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Radio className="h-3.5 w-3.5 text-red-400" />
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    Live Lobby
                  </span>
                  {fanCount > 0 && (
                    <span className="text-[10px] font-mono text-cyan-300/80">· {fanCount} watching</span>
                  )}
                </div>
                {isMobile && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="text-[10px] font-bold uppercase tracking-wide text-white/40 hover:text-white/70"
                  >
                    Hide
                  </button>
                )}
              </div>

              <LiveCommentStream battleId={battleId} className="px-1 pt-1" />

              <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

              <div className="px-3 pb-3">
                <FanActionBar battleId={battleId} barber1={barber1} barber2={barber2} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
