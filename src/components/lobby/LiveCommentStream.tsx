import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBattleChat } from '@/hooks/useBattleChat';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveCommentStreamProps {
  battleId: string;
  className?: string;
}

interface DisplayMessage {
  id: string;
  username: string;
  message: string;
  userType: string;
  expiresAt: number;
}

const MESSAGE_LIFESPAN = 12000;

export const LiveCommentStream = ({ battleId, className = '' }: LiveCommentStreamProps) => {
  const { user } = useAuth();
  const { messages, sendMessage, canSendMessage } = useBattleChat(battleId);
  const [visible, setVisible] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    setVisible((prev) => {
      if (prev.some((m) => m.id === last.id)) return prev;
      const next: DisplayMessage = {
        id: last.id,
        username: last.user?.username || 'Anonymous',
        message: last.message,
        userType: last.user?.user_type || 'fan',
        expiresAt: Date.now() + MESSAGE_LIFESPAN,
      };
      return [...prev.slice(-9), next];
    });
  }, [messages]);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible((prev) => prev.filter((m) => m.expiresAt > Date.now()));
    }, 500);
    return () => clearInterval(t);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !draft.trim() || !canSendMessage) return;
    const ok = await sendMessage(draft.trim(), user.id);
    if (ok) setDraft('');
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="relative h-32 overflow-hidden sm:h-40">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 px-2 pb-1">
          <AnimatePresence initial={false}>
            {visible.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 12, x: -4 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.3 }}
                className="flex items-baseline gap-1.5 text-xs"
              >
                <span className={`font-bold ${m.userType === 'barber' ? 'text-orange-300' : 'text-cyan-300'}`}>
                  {m.username}:
                </span>
                <span className="truncate text-white/90">{m.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {user && (
        <form onSubmit={handleSend} className="mt-1 flex gap-1.5 px-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={canSendMessage ? 'Say something...' : 'Slow down...'}
            disabled={!canSendMessage}
            maxLength={200}
            className="h-8 flex-1 border-white/15 bg-white/5 text-xs text-white placeholder:text-white/40 focus-visible:ring-cyan-400/50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || !canSendMessage}
            className="h-8 w-8 shrink-0 bg-cyan-500 hover:bg-cyan-400 text-black"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      )}
    </div>
  );
};
