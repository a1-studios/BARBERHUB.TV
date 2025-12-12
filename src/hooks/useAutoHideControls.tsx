import { useState, useCallback, useEffect, useRef } from 'react';

interface UseAutoHideControlsOptions {
  hideDelay?: number;
  enableOnMobile?: boolean;
  isMobile?: boolean;
}

interface UseAutoHideControlsReturn {
  showControls: boolean;
  handleScreenTap: () => void;
  resetControlsTimer: () => void;
}

export const useAutoHideControls = (options: UseAutoHideControlsOptions = {}): UseAutoHideControlsReturn => {
  const { hideDelay = 3000, enableOnMobile = true, isMobile = false } = options;
  
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetControlsTimer = useCallback(() => {
    clearTimer();
    setShowControls(true);
    
    if (isMobile && enableOnMobile) {
      timeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, hideDelay);
    }
  }, [isMobile, enableOnMobile, hideDelay, clearTimer]);

  const handleScreenTap = useCallback(() => {
    if (isMobile) {
      setShowControls(prev => !prev);
      if (!showControls) {
        resetControlsTimer();
      }
    }
  }, [isMobile, showControls, resetControlsTimer]);

  // Auto-hide on mobile after delay
  useEffect(() => {
    if (isMobile && enableOnMobile && showControls) {
      timeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, hideDelay);
      
      return clearTimer;
    }
  }, [isMobile, enableOnMobile, showControls, hideDelay, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return {
    showControls,
    handleScreenTap,
    resetControlsTimer,
  };
};
