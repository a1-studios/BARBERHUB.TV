import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const BattleWindowTimer = () => {
  const [status, setStatus] = useState<{
    isLive: boolean;
    message: string;
    countdown: string;
    totalSeconds: number;
  }>({ isLive: false, message: '', countdown: '', totalSeconds: 0 });

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();

      if (day === 0 && hour >= 10 && hour < 18) {
        setStatus({
          isLive: true,
          message: 'LIVE',
          countdown: '',
          totalSeconds: 0
        });
        return;
      }

      const nextSunday = new Date(now);
      const daysUntil = day === 0 ? 7 : (7 - day);
      nextSunday.setDate(now.getDate() + daysUntil);
      nextSunday.setHours(10, 0, 0, 0);

      const diff = nextSunday.getTime() - now.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setStatus({
        isLive: false,
        message: 'Next Battle',
        countdown: `${days}d ${hours}h ${minutes}m`,
        totalSeconds
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate sand animation progress (0-1)
  const sandProgress = status.isLive ? 1 : Math.min(1, 1 - (status.totalSeconds % 60) / 60);

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border shadow-lg">
      {/* Sand Clock Icon with Animation */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Hourglass Frame */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Top Bulb */}
          <div className="w-8 h-4 border-2 border-primary rounded-t-full overflow-hidden relative">
            <motion.div
              className={cn(
                "absolute bottom-0 left-0 right-0 bg-primary/30",
                status.isLive && "bg-red-500/50"
              )}
              animate={{ height: `${(1 - sandProgress) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {/* Middle Neck */}
          <div className="w-1 h-2 bg-primary" />
          {/* Bottom Bulb */}
          <div className="w-8 h-4 border-2 border-primary rounded-b-full overflow-hidden relative">
            <motion.div
              className={cn(
                "absolute top-0 left-0 right-0 bg-primary",
                status.isLive && "bg-red-500 animate-pulse"
              )}
              animate={{ height: `${sandProgress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        {status.isLive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Countdown Text */}
      <div className="flex flex-col">
        <span className={cn(
          "text-xs font-medium",
          status.isLive ? "text-red-500" : "text-muted-foreground"
        )}>
          {status.message}
        </span>
        <span className={cn(
          "text-sm font-bold",
          status.isLive ? "text-red-500" : "text-foreground"
        )}>
          {status.isLive ? '🔴 NOW' : status.countdown}
        </span>
      </div>
    </div>
  );
};
