import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export const BattleWindowTimer = () => {
  const [status, setStatus] = useState<{
    isLive: boolean;
    message: string;
    countdown: string;
  }>({ isLive: false, message: '', countdown: '' });

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday
      const hour = now.getHours();

      // Check if currently Sunday 10 AM - 6 PM
      if (day === 0 && hour >= 10 && hour < 18) {
        setStatus({
          isLive: true,
          message: 'Battles are LIVE NOW!',
          countdown: ''
        });
        return;
      }

      // Calculate next Sunday 10 AM
      const nextSunday = new Date(now);
      const daysUntil = day === 0 ? 7 : (7 - day);
      nextSunday.setDate(now.getDate() + daysUntil);
      nextSunday.setHours(10, 0, 0, 0);

      const diff = nextSunday.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setStatus({
        isLive: false,
        message: 'Next battle window:',
        countdown: `${days}d ${hours}h ${minutes}m ${seconds}s`
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "w-full py-6 text-center border-b",
        status.isLive
          ? "bg-gradient-to-r from-red-500/20 via-primary/20 to-red-500/20 animate-pulse"
          : "bg-gradient-to-r from-primary/10 to-secondary/10"
      )}
    >
      <div className="container mx-auto px-4">
        {status.isLive ? (
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground">
              🔴 BATTLES ARE LIVE NOW!
            </h2>
          </div>
        ) : (
          <div>
            <p className="text-sm sm:text-lg text-muted-foreground mb-2">{status.message}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">
              T-minus {status.countdown}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Until battles begin (Sunday 10:00 AM - 6:00 PM)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
