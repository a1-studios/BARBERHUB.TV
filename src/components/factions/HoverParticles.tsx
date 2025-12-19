import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
}

interface HoverParticlesProps {
  isHovered: boolean;
  color: string;
}

export const HoverParticles = ({ isHovered, color }: HoverParticlesProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawnParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: 80 + Math.random() * 20
      });
    }
    setParticles(newParticles);

    // Clear particles after animation
    setTimeout(() => setParticles([]), 1000);
  }, []);

  // Spawn particles when hover starts
  if (isHovered && particles.length === 0) {
    spawnParticles();
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: `${particle.x}%`,
              y: `${particle.y}%`,
              opacity: 1,
              scale: 0
            }}
            animate={{ 
              y: `${particle.y - 60 - Math.random() * 40}%`,
              opacity: 0,
              scale: 1
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6 + Math.random() * 0.4,
              ease: "easeOut"
            }}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ 
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}`
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
