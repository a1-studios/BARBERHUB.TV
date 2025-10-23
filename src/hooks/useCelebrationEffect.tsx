import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface UseCelebrationEffectProps {
  barber1Viewers: number;
  barber2Viewers: number;
  enabled?: boolean;
}

export const useCelebrationEffect = ({ 
  barber1Viewers, 
  barber2Viewers,
  enabled = true 
}: UseCelebrationEffectProps) => {
  const previousLeader = useRef<'barber1' | 'barber2' | 'tie' | null>(null);
  
  useEffect(() => {
    if (!enabled || barber1Viewers === 0 && barber2Viewers === 0) return;

    const currentLeader = 
      barber1Viewers > barber2Viewers ? 'barber1' :
      barber2Viewers > barber1Viewers ? 'barber2' : 'tie';

    // Trigger celebration when leadership changes
    if (previousLeader.current && previousLeader.current !== currentLeader && currentLeader !== 'tie') {
      const colors = currentLeader === 'barber1' 
        ? ['#3b82f6', '#60a5fa', '#93c5fd'] // Blue theme
        : ['#8b5cf6', '#a78bfa', '#c4b5fd']; // Purple theme

      // Confetti burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: colors,
        disableForReducedMotion: true
      });

      // Side cannons for bigger overtakes
      const difference = Math.abs(barber1Viewers - barber2Viewers);
      const percentDiff = difference / Math.max(barber1Viewers, barber2Viewers);
      
      if (percentDiff < 0.1) { // Close race - extra celebration
        setTimeout(() => {
          confetti({
            particleCount: 30,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: colors
          });
          confetti({
            particleCount: 30,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: colors
          });
        }, 200);
      }
    }

    previousLeader.current = currentLeader;
  }, [barber1Viewers, barber2Viewers, enabled]);
};
