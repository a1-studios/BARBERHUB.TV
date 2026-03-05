import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export function QuickBookBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('quick-book-dismissed') === 'true');

  const { data: topBarbers } = useQuery({
    queryKey: ['top-barbers-quick-book'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_barber_profiles')
        .select('user_id, barber_name, display_name, specialty, avatar_url, rating, follower_count')
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !dismissed,
  });

  const handleDismiss = () => {
    sessionStorage.setItem('quick-book-dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed || !topBarbers?.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border border-primary/30 p-4 mb-6"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 text-muted-foreground"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Top Barbers — Book Now</h3>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-2">
            {topBarbers.map((barber) => (
              <button
                key={barber.user_id}
                onClick={() => navigate(`/barber/${barber.user_id}`)}
                className="flex flex-col items-center gap-1.5 min-w-[72px] group"
              >
                <Avatar className="w-12 h-12 ring-2 ring-primary/40 group-hover:ring-primary transition-all">
                  <AvatarImage src={barber.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {(barber.barber_name || barber.display_name || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-medium text-foreground truncate max-w-[72px]">
                  {barber.barber_name || barber.display_name || 'Barber'}
                </span>
                {barber.specialty && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[72px]">
                    {barber.specialty}
                  </span>
                )}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
