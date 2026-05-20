import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minimize2 } from 'lucide-react';

interface SplitScreenBattleProps {
  barber1_video: string;
  barber2_video: string;
  barber1_name: string;
  barber1_location: string;
  barber2_name: string;
  barber2_location: string;
  isActive: boolean;
  isPreloading?: boolean;
  battleId: string;
}

const SplitScreenBattle = ({
  barber1_video,
  barber2_video,
  barber1_name,
  barber1_location,
  barber2_name,
  barber2_location,
  isActive,
  isPreloading = false,
}: SplitScreenBattleProps) => {
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  // Gate decoders on isActive / isPreloading.
  // - active: attach src + play
  // - preloading (next slot): attach src so the browser warms TCP + manifest, but DO NOT play
  // - idle: release decoder
  useEffect(() => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    if (isActive) {
      if (v1 && v1.getAttribute('src') !== barber1_video) v1.src = barber1_video;
      if (v2 && v2.getAttribute('src') !== barber2_video) v2.src = barber2_video;
      v1?.play().catch(() => {});
      v2?.play().catch(() => {});
    } else if (isPreloading) {
      if (v1 && v1.getAttribute('src') !== barber1_video) v1.src = barber1_video;
      if (v2 && v2.getAttribute('src') !== barber2_video) v2.src = barber2_video;
      // explicitly do not call play()
    } else {
      [v1, v2].forEach((v) => {
        if (!v) return;
        try { v.pause(); v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
      });
    }
  }, [isActive, isPreloading, barber1_video, barber2_video]);

  const handleDrag = (_event: any, info: any) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    let newPercent = ((info.point.x - rect.left) / rect.width) * 100;
    newPercent = Math.max(0, Math.min(100, newPercent));
    setSplitPercent(newPercent);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (splitPercent > 80) setSplitPercent(100);
    else if (splitPercent < 20) setSplitPercent(0);
    else setSplitPercent(50);
  };

  const resetSplit = () => setSplitPercent(50);

  const isLeftFull = splitPercent === 100;
  const isRightFull = splitPercent === 0;

  return (
    <div ref={containerRef} className="relative h-full w-full bg-black overflow-hidden select-none">
      {/* LEFT OPPONENT */}
      <motion.div
        animate={{ width: `${splitPercent}%` }}
        transition={{ type: 'spring', stiffness: isDragging ? 1000 : 300, damping: 30 }}
        className="absolute left-0 top-0 h-full z-10 overflow-hidden border-r border-border/10"
      >
        <video
          ref={video1Ref}
          className="h-full w-full object-cover"
          loop
          muted
          playsInline
          preload={isActive ? 'auto' : isPreloading ? 'metadata' : 'none'}
        />
        {splitPercent > 30 && (
          <div className="absolute bottom-24 left-4 text-white z-30">
            <p className="text-xs uppercase opacity-70">{barber1_location}</p>
            <h2 className="text-2xl font-black uppercase italic leading-tight">{barber1_name}</h2>
            {isLeftFull && (
              <button className="mt-4 bg-primary px-8 py-2 rounded-lg font-bold text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.5)]">
                VOTE
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* RIGHT OPPONENT */}
      <motion.div
        animate={{ width: `${100 - splitPercent}%`, left: `${splitPercent}%` }}
        transition={{ type: 'spring', stiffness: isDragging ? 1000 : 300, damping: 30 }}
        className="absolute top-0 h-full z-10 overflow-hidden"
      >
        <video
          ref={video2Ref}
          className="h-full w-full object-cover"
          loop
          muted
          playsInline
          preload="none"
        />
        {splitPercent < 70 && (
          <div className="absolute bottom-24 right-4 text-right text-white z-30">
            <p className="text-xs uppercase opacity-70">{barber2_location}</p>
            <h2 className="text-2xl font-black uppercase italic leading-tight">{barber2_name}</h2>
            {isRightFull && (
              <button className="mt-4 bg-accent px-8 py-2 rounded-lg font-bold text-accent-foreground shadow-[0_0_15px_hsl(var(--accent)/0.5)]">
                VOTE
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* INTERACTIVE DRAG BUTTON */}
      {!isLeftFull && !isRightFull && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 z-40"
          animate={{ left: `${splitPercent}%` }}
          transition={{ type: 'spring', stiffness: isDragging ? 1000 : 300, damping: 30 }}
          style={{ x: '-50%' }}
        >
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            whileTap={{ scale: 1.1 }}
            className="w-16 h-16 bg-card border-4 border-border rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] cursor-grab active:cursor-grabbing"
          >
            <span className="text-foreground font-black italic text-xl">VS</span>
          </motion.div>
        </motion.div>
      )}

      {/* ESCAPE HATCH */}
      {(isLeftFull || isRightFull) && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={resetSplit}
          className="absolute top-24 right-6 z-50 bg-background/60 backdrop-blur-md border border-border/20 p-3 rounded-full text-foreground hover:bg-background/80 transition"
        >
          <Minimize2 size={24} />
        </motion.button>
      )}
    </div>
  );
};

export default SplitScreenBattle;
