import { motion } from 'framer-motion';
import { Users, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

  return (
    <div className="space-y-4">
      {/* Viewer Count Display */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-lg border border-primary/20">
        <div className="text-center flex-1">
          <motion.div 
            key={barber1Viewers}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold text-primary"
          >
            {barber1Viewers.toLocaleString()}
          </motion.div>
          <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" />
            Live Viewers
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Peak: {barber1Peak.toLocaleString()}
          </div>
        </div>
        
        <div className="text-2xl font-bold text-muted-foreground px-6">
          VS
        </div>
        
        <div className="text-center flex-1">
          <motion.div 
            key={barber2Viewers}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold text-secondary"
          >
            {barber2Viewers.toLocaleString()}
          </motion.div>
          <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" />
            Live Viewers
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Peak: {barber2Peak.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full h-3 bg-secondary/20 rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ width: '50%' }}
            animate={{ width: `${barber1Percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-primary to-primary/80 relative"
          >
            {barber1Viewers > barber2Viewers && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-white/20"
              />
            )}
          </motion.div>
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="font-medium">{barber1Name}</span>
          <span className="font-medium">{barber2Name}</span>
        </div>
      </div>

      {/* Last Update Indicator */}
      {lastUpdate && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-green-500 rounded-full"
          />
          <span>Updated {formatDistanceToNow(new Date(lastUpdate))} ago</span>
        </div>
      )}
    </div>
  );
};
