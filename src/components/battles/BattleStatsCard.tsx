import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Users, Eye, TrendingUp, Clock } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';

interface BattleStatsCardProps {
  totalViewers: number;
  peakViewers: number;
  averageViewers?: number;
  duration?: string;
  className?: string;
}

export const BattleStatsCard = ({
  totalViewers,
  peakViewers,
  averageViewers,
  duration,
  className = ''
}: BattleStatsCardProps) => {
  return (
    <Card className={`p-4 bg-card/50 backdrop-blur-sm border-border/50 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Viewers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Current</span>
          </div>
          <div className="text-2xl font-bold text-primary">
            <AnimatedCounter value={totalViewers} />
          </div>
        </motion.div>

        {/* Peak Viewers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <span className="text-xs text-muted-foreground">Peak</span>
          </div>
          <div className="text-2xl font-bold text-secondary">
            <AnimatedCounter value={peakViewers} />
          </div>
        </motion.div>

        {/* Average Viewers */}
        {averageViewers !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Average</span>
            </div>
            <div className="text-2xl font-bold text-accent">
              <AnimatedCounter value={averageViewers} />
            </div>
          </motion.div>
        )}

        {/* Duration */}
        {duration && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Duration</span>
            </div>
            <div className="text-lg font-semibold text-foreground">
              {duration}
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
};
