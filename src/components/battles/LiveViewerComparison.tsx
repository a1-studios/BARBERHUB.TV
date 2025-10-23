import { motion } from 'framer-motion';
import { Users, TrendingUp, Crown, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AnimatedCounter } from './AnimatedCounter';
import { useCelebrationEffect } from '@/hooks/useCelebrationEffect';
import { cn } from '@/lib/utils';

interface LiveViewerComparisonProps {
  barber1Name: string;
  barber2Name: string;
  barber1Viewers: number;
  barber2Viewers: number;
  barber1Peak: number;
  barber2Peak: number;
  lastUpdate: string | null;
}

export const LiveViewerComparison = ({
  barber1Name,
  barber2Name,
  barber1Viewers,
  barber2Viewers,
  barber1Peak,
  barber2Peak,
  lastUpdate
}: LiveViewerComparisonProps) => {
  const totalViewers = barber1Viewers + barber2Viewers;
  const barber1Percentage = totalViewers > 0 ? (barber1Viewers / totalViewers) * 100 : 50;
  const isBarber1Leading = barber1Viewers > barber2Viewers;
  const isBarber2Leading = barber2Viewers > barber1Viewers;
  const isTied = barber1Viewers === barber2Viewers && barber1Viewers > 0;
  
  // Celebration effects when leadership changes
  useCelebrationEffect({ barber1Viewers, barber2Viewers, enabled: true });

  return (
    <div className="space-y-4">
      {/* Viewer Count Display */}
      <div className="relative overflow-hidden p-6 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-lg border border-primary/20">
        {/* Animated background effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          style={{ backgroundSize: '200% 200%' }}
        />
        
        <div className="relative flex items-center justify-between">
          {/* Barber 1 */}
          <div className={cn(
            "text-center flex-1 transition-all duration-500",
            isBarber1Leading && "scale-105"
          )}>
            <div className="relative inline-block">
              {isBarber1Leading && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2"
                >
                  <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                </motion.div>
              )}
              <div className={cn(
                "text-3xl font-bold",
                isBarber1Leading ? "text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "text-primary"
              )}>
                <AnimatedCounter value={barber1Viewers} />
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              Live Viewers
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Peak: <AnimatedCounter value={barber1Peak} className="font-semibold" />
            </div>
          </div>
          
          {/* VS Divider */}
          <div className="relative px-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl font-bold text-muted-foreground"
            >
              VS
            </motion.div>
            {isTied && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-amber-500"
              >
                TIE!
              </motion.div>
            )}
          </div>
          
          {/* Barber 2 */}
          <div className={cn(
            "text-center flex-1 transition-all duration-500",
            isBarber2Leading && "scale-105"
          )}>
            <div className="relative inline-block">
              {isBarber2Leading && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2"
                >
                  <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                </motion.div>
              )}
              <div className={cn(
                "text-3xl font-bold",
                isBarber2Leading ? "text-secondary drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "text-secondary"
              )}>
                <AnimatedCounter value={barber2Viewers} />
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              Live Viewers
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Peak: <AnimatedCounter value={barber2Peak} className="font-semibold" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar with Percentage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold mb-1">
          <span className={cn(
            "transition-colors",
            isBarber1Leading ? "text-primary" : "text-muted-foreground"
          )}>
            {barber1Name}
          </span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="w-3 h-3" />
            <span>Live Battle</span>
          </div>
          <span className={cn(
            "transition-colors",
            isBarber2Leading ? "text-secondary" : "text-muted-foreground"
          )}>
            {barber2Name}
          </span>
        </div>
        
        <div className="relative w-full h-4 bg-secondary/20 rounded-full overflow-hidden border border-border">
          {/* Progress fill */}
          <motion.div 
            initial={{ width: '50%' }}
            animate={{ width: `${barber1Percentage}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "h-full relative",
              isBarber1Leading 
                ? "bg-gradient-to-r from-primary via-primary/90 to-primary/80" 
                : "bg-gradient-to-r from-primary/60 to-primary/50"
            )}
          >
            {/* Shimmer effect when leading */}
            {isBarber1Leading && (
              <motion.div
                animate={{ 
                  x: ['-100%', '100%'],
                  opacity: [0, 0.5, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: 'linear'
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            )}
          </motion.div>
          
          {/* Percentage labels */}
          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold">
            <span className={cn(
              "drop-shadow-md transition-colors",
              barber1Percentage > 20 ? "text-white" : "text-primary"
            )}>
              {barber1Percentage.toFixed(0)}%
            </span>
            <span className={cn(
              "drop-shadow-md transition-colors",
              barber1Percentage < 80 ? "text-white" : "text-secondary"
            )}>
              {(100 - barber1Percentage).toFixed(0)}%
            </span>
          </div>
        </div>
        
        {/* Total viewers count */}
        <div className="text-center text-xs text-muted-foreground mt-1">
          Total: <span className="font-semibold"><AnimatedCounter value={totalViewers} /></span> viewers watching
        </div>
      </div>

      {/* Last Update Indicator with sync status */}
      {lastUpdate && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-xs"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            />
            <span className="text-green-600 dark:text-green-400 font-medium">
              Live - Updated {formatDistanceToNow(new Date(lastUpdate))} ago
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
