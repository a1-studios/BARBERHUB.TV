import { Badge } from '@/components/ui/badge';
import { Play, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface BarberVideoSectionProps {
  videoId?: string | null;
  isLive?: boolean;
  viewerCount?: number;
  aspectRatio?: 'portrait' | 'landscape';
  className?: string;
}

export const BarberVideoSection = ({ 
  videoId, 
  isLive = false,
  viewerCount = 0,
  aspectRatio = 'landscape',
  className = ''
}: BarberVideoSectionProps) => {
  const aspectClass = className.includes('aspect-square') 
    ? 'aspect-square' 
    : aspectRatio === 'portrait' 
      ? 'aspect-[9/16]' 
      : 'aspect-video';
  
  if (!videoId) {
    return (
      <div className={`${aspectClass} bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-2">
          <Play className="w-12 h-12 mx-auto text-primary/40" />
          <p className="text-sm text-muted-foreground">No video available</p>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${isLive ? 1 : 0}&mute=${isLive ? 1 : 0}`;

  return (
    <div className={`relative ${aspectClass} ${className}`}>
      {isLive && (
        <Badge 
          variant="destructive" 
          className="absolute top-2 left-2 z-10 bg-red-600 text-white animate-pulse"
        >
          🔴 LIVE
        </Badge>
      )}
      
      {/* Live viewer count overlay */}
      {isLive && viewerCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-2 right-2 z-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/30 shadow-lg"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Users className="w-4 h-4 text-red-500" />
          </motion.div>
          <motion.span 
            key={viewerCount}
            initial={{ scale: 1.3, color: '#22c55e' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.3 }}
            className="text-white font-bold text-sm"
          >
            {viewerCount.toLocaleString()}
          </motion.span>
        </motion.div>
      )}
      
      <iframe
        src={embedUrl}
        className="w-full h-full rounded-lg border border-primary/20"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
