import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import VaultSpinWheel, { Prize, PrizeSet } from '@/components/vault/VaultSpinWheel';

interface VaultWheelStepProps {
  prizeSet: PrizeSet;
  onResult: (prize: Prize) => void;
}

const LEVER_TRAVEL = 140; // px the lever can be dragged

export const VaultWheelStep = ({ prizeSet, onResult }: VaultWheelStepProps) => {
  const [armed, setArmed] = useState(false);
  const y = useMotionValue(0);
  const handleColor = useTransform(y, [0, LEVER_TRAVEL], ['#00F0FF', '#FF5F00']);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = () => {
    if (y.get() >= LEVER_TRAVEL * 0.85) {
      setArmed(true);
      // Programmatically click the inner wheel's spin button
      requestAnimationFrame(() => {
        const btn = wheelRef.current?.querySelector('button');
        btn?.click();
      });
    } else {
      // Snap back
      y.set(0);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 space-y-6">
      <div className="text-center space-y-1.5">
        <h2
          className="text-2xl md:text-3xl font-black tracking-[0.2em] uppercase"
          style={{ color: '#fff', textShadow: '0 0 12px rgba(255,95,0,0.5)' }}
        >
          The Vault
        </h2>
        <p className="text-[10px] uppercase tracking-[0.3em] font-mono" style={{ color: '#FF8C00' }}>
          {armed ? '◢ Engaged · Spinning' : '◢ Pull lever to engage'}
        </p>
      </div>

      {/* Vault chassis */}
      <div
        className="relative p-6 border-2"
        style={{
          borderColor: 'rgba(255,95,0,0.4)',
          background:
            'radial-gradient(circle at center, #1a1a1a, #050505 70%), repeating-linear-gradient(0deg, transparent 0 1px, rgba(255,255,255,0.02) 1px 2px)',
          boxShadow:
            '0 0 40px rgba(255,95,0,0.15), inset 0 0 30px rgba(0,0,0,0.9)',
          borderRadius: '4px',
        }}
      >
        {/* Corner rivets */}
        {[
          'top-2 left-2',
          'top-2 right-2',
          'bottom-2 left-2',
          'bottom-2 right-2',
        ].map((pos) => (
          <span
            key={pos}
            className={`absolute ${pos} w-2 h-2 rounded-full`}
            style={{
              background: 'radial-gradient(circle, #FF5F00, #1a1a1a)',
              boxShadow: '0 0 4px rgba(255,95,0,0.6)',
            }}
          />
        ))}

        <div ref={wheelRef} className="relative">
          {/* The original spin button is hidden — lever triggers it */}
          <style>{`
            .vault-wheel-hide-btn button { display: none !important; }
          `}</style>
          <div className={armed ? '' : 'vault-wheel-hide-btn'}>
            <VaultSpinWheel prizeSet={prizeSet} onResult={onResult} />
          </div>
        </div>
      </div>

      {/* Lever */}
      <AnimatePresence>
        {!armed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="relative w-12"
              style={{ height: LEVER_TRAVEL + 60 }}
            >
              {/* Rail */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-0 w-2 rounded-full"
                style={{
                  height: '100%',
                  background:
                    'linear-gradient(180deg, rgba(0,240,255,0.6), rgba(255,95,0,0.6))',
                  boxShadow: '0 0 12px rgba(0,240,255,0.3)',
                }}
              />
              {/* Lever knob */}
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: LEVER_TRAVEL }}
                dragElastic={0.05}
                style={{ y, background: handleColor }}
                onDragEnd={handleDragEnd}
                whileTap={{ scale: 0.92 }}
                className="absolute left-1/2 -translate-x-1/2 -top-1 w-12 h-12 rounded-full border-2 cursor-grab active:cursor-grabbing flex items-center justify-center font-black text-black"
                animate={{
                  boxShadow: [
                    '0 0 16px rgba(0,240,255,0.6)',
                    '0 0 24px rgba(0,240,255,0.9)',
                    '0 0 16px rgba(0,240,255,0.6)',
                  ],
                }}
                transition={{
                  boxShadow: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                <span className="text-[10px] tracking-tight">PULL</span>
              </motion.div>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-mono" style={{ color: '#5a6a6d' }}>
              ↓ Drag down to engage ↓
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
