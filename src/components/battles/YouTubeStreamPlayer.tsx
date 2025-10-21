import { Badge } from "@/components/ui/badge";

interface YouTubeStreamPlayerProps {
  videoUrl: string;
  isLive?: boolean;
  title?: string;
  size?: 'small' | 'medium' | 'large';
}

export const YouTubeStreamPlayer = ({ 
  videoUrl, 
  isLive = false, 
  title,
  size = 'medium'
}: YouTubeStreamPlayerProps) => {
  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const videoId = getYouTubeVideoId(videoUrl);

  if (!videoId) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center rounded-lg">
        <p className="text-white/60 text-sm">Invalid YouTube URL</p>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}${isLive ? '?autoplay=1&mute=1' : ''}`;

  // Size-based styling
  const badgeSizeClasses = {
    small: 'text-[8px] px-1.5 py-0.5',
    medium: 'text-xs px-2 py-1',
    large: 'text-sm px-3 py-1.5'
  };

  const titleSizeClasses = {
    small: 'text-[8px] px-1.5 py-0.5',
    medium: 'text-xs px-2 py-1',
    large: 'text-sm px-3 py-2'
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden group">
      {/* LIVE Badge */}
      {isLive && (
        <div className={`absolute ${size === 'large' ? 'top-4 left-4' : 'top-2 left-2'} z-10`}>
          <Badge 
            variant="destructive" 
            className={`bg-red-600 text-white font-bold animate-pulse ${badgeSizeClasses[size]}`}
          >
            🔴 LIVE
          </Badge>
        </div>
      )}
      
      {/* Title Badge */}
      {title && size !== 'large' && (
        <div className={`absolute ${size === 'medium' ? 'bottom-2 left-2 right-2' : 'bottom-1 left-1 right-1'} z-10`}>
          <div className={`bg-black/70 backdrop-blur-sm rounded text-white truncate ${titleSizeClasses[size]}`}>
            {title}
          </div>
        </div>
      )}

      {/* YouTube Embed */}
      <iframe
        src={embedUrl}
        title={title || "YouTube Video"}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
