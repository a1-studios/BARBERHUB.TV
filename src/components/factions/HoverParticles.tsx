import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  type: 'spark' | 'bolt';
}

interface HoverParticlesProps {
  isHovered: boolean;
  color: string;
}

export const HoverParticles = ({ isHovered, color }: HoverParticlesProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawnParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    // Spawn electric sparks
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: 20 + Math.random() * 60,
        y: 70 + Math.random() * 20,
        type: 'spark'
      });
    }
    // Spawn small lightning bolts
    for (let i = 0; i < 4; i++) {
      newParticles.push({
        id: Date.now() + 100 + i,
        x: 10 + Math.random() * 80,
        y: 50 + Math.random() * 30,
        type: 'bolt'
      });
    }
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    if (isHovered) {
      spawnParticles();
      const interval = setInterval(spawnParticles, 800);
      return () => clearInterval(interval);
    } else {
      setParticles([]);
    }
  }, [isHovered, spawnParticles]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              opacity: 1,
              scale: particle.type === 'bolt' ? 0.5 : 0
            }}
            animate={{ 
              top: `${particle.y - 30 - Math.random() * 40}%`,
              left: `${particle.x + (Math.random() - 0.5) * 20}%`,
              opacity: 0,
              scale: particle.type === 'bolt' ? 1.2 : 1,
              rotate: particle.type === 'bolt' ? [0, 15, -15, 0] : 0
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: particle.type === 'bolt' ? 0.4 : 0.6,
              ease: "easeOut"
            }}
            className="absolute"
          >
            {particle.type === 'spark' ? (
              <div 
                className="w-1 h-1 rounded-full"
                style={{ 
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`
                }}
              />
            ) : (
              <svg width="8" height="16" viewBox="0 0 8 16" fill="none">
                <path 
                  d="M4 0 L6 6 L4 6 L6 16 L2 8 L4 8 L2 0 Z" 
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
              </svg>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
