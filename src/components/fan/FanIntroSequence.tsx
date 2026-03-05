import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SkipForward } from 'lucide-react';

interface FanIntroSequenceProps {
  onComplete: () => void;
}

export const FanIntroSequence = ({ onComplete }: FanIntroSequenceProps) => {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Fallback: auto-dismiss after 8 seconds even if video hasn't ended
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 8000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleEnd = () => {
    // Give a brief pause after video ends before dissolving
    setTimeout(() => setVisible(false), 500);
  };

  const handleSkip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="fan-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          <video
            ref={videoRef}
            src="/videos/promo-hero.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleEnd}
            className="w-full h-full object-contain"
          />

          {/* Skip button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="absolute top-6 right-6 text-white/60 hover:text-white hover:bg-white/10 gap-1.5 z-10"
          >
            Skip Intro
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
