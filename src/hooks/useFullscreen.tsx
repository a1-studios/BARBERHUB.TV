import { useState, useCallback, useEffect, RefObject } from 'react';

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

export const useFullscreen = (containerRef?: RefObject<HTMLElement>): UseFullscreenReturn => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFullscreen = useCallback(() => {
    const element = containerRef?.current || document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(console.error);
    }
  }, [containerRef]);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
};
