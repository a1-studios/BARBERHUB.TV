import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Radio, Users, Clock, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContenderTopBarProps {
  title: string;
  isStreaming: boolean;
  viewerCount: number;
  formattedDuration: string;
  isFullscreen: boolean;
  showControls: boolean;
  isMobile: boolean;
  onToggleFullscreen: () => void;
}

export const ContenderTopBar = memo(function ContenderTopBar({
  title,
  isStreaming,
  viewerCount,
  formattedDuration,
  isFullscreen,
  showControls,
  isMobile,
  onToggleFullscreen,
}: ContenderTopBarProps) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-2 pt-safe controls-overlay",
      isMobile && !showControls && "controls-hidden"
    )}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            className="text-white hover:bg-white/20 w-10 h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-bold text-sm md:text-lg truncate">{title}</h1>
            <p className="text-white/60 text-xs hidden md:block">Contender Theater</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {isStreaming && (
            <>
              <Badge className="bg-red-600 text-white animate-pulse text-xs">
                <Radio className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
              <div className="hidden md:flex items-center gap-2 text-white/80">
                <Users className="w-4 h-4" />
                <span className="font-mono text-sm">{viewerCount}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-white/80">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-sm">{formattedDuration}</span>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
            className="text-white hover:bg-white/20 w-10 h-10"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
});
