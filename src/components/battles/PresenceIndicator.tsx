import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { useBattlePresence } from '@/hooks/useBattlePresence';

interface PresenceIndicatorProps {
  battleId: string;
  className?: string;
}

export const PresenceIndicator = ({ battleId, className }: PresenceIndicatorProps) => {
  const { viewers, viewerCount } = useBattlePresence(battleId);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2">
        <Users className="h-4 w-4 text-red-500" />
        <span className="text-sm font-semibold">{viewerCount}</span>
        <span className="text-xs text-muted-foreground">watching</span>
        
        {/* Show first few viewer avatars */}
        <div className="flex -space-x-2 ml-2">
          {viewers.slice(0, 5).map((viewer, index) => (
            <motion.div
              key={viewer.user_id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarImage src={viewer.avatar_url} />
                <AvatarFallback className="text-xs">
                  {viewer.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
          {viewerCount > 5 && (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border-2 border-background">
              <span className="text-[10px] font-semibold">+{viewerCount - 5}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
