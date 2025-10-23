import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';

interface BarberVideoSectionProps {
  videoId?: string | null;
  isLive?: boolean;
  aspectRatio?: 'portrait' | 'landscape';
  className?: string;
}

export const BarberVideoSection = ({ 
  videoId, 
  isLive = false, 
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
      <iframe
        src={embedUrl}
        className="w-full h-full rounded-lg border border-primary/20"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
