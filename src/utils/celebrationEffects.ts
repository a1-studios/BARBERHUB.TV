import confetti from 'canvas-confetti';

/**
 * Celebration Effects for Battle Interactions
 */

export const CelebrationEffects = {
  /**
   * Subtle particle burst from vote button
   */
  vote: (x: number, y: number) => {
    confetti({
      particleCount: 10,
      spread: 30,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#3b82f6', '#60a5fa'],
      ticks: 50,
      gravity: 1.2,
      scalar: 0.5,
      disableForReducedMotion: true
    });
  },

  /**
   * Hearts float up from profile
   */
  like: (x: number, y: number) => {
    confetti({
      particleCount: 5,
      spread: 40,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#ef4444', '#f87171', '#fca5a5'],
      shapes: ['circle'],
      ticks: 100,
      gravity: 0.5,
      scalar: 1,
      startVelocity: 15,
      disableForReducedMotion: true
    });
  },

  /**
   * Sparkle effect around follow button
   */
  follow: (x: number, y: number) => {
    confetti({
      particleCount: 15,
      spread: 50,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#fbbf24', '#fcd34d', '#fde68a'],
      shapes: ['star'],
      ticks: 80,
      gravity: 1,
      scalar: 0.8,
      disableForReducedMotion: true
    });
  },

  /**
   * Money rain animation for donations
   */
  donate: () => {
    const duration = 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#34d399'],
        disableForReducedMotion: true
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#34d399'],
        disableForReducedMotion: true
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  },

  /**
   * Full-screen confetti explosion for winner
   */
  winner: (winnerSide: 'left' | 'right') => {
    const colors = winnerSide === 'left' 
      ? ['#3b82f6', '#60a5fa', '#93c5fd']
      : ['#8b5cf6', '#a78bfa', '#c4b5fd'];

    // Center burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
      disableForReducedMotion: true
    });

    // Side cannons
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        disableForReducedMotion: true
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        disableForReducedMotion: true
      });
    }, 200);
  },

  /**
   * Screen flash and particle burst for combo milestones
   */
  combo: (level: number, x: number, y: number) => {
    const particleCount = Math.min(level * 10, 100);
    const colors = level >= 10 
      ? ['#f59e0b', '#fbbf24', '#fcd34d']
      : level >= 5
      ? ['#3b82f6', '#60a5fa']
      : ['#10b981', '#34d399'];

    confetti({
      particleCount,
      spread: 60 + level * 10,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors,
      ticks: 100,
      gravity: 1.2,
      scalar: 0.8 + level * 0.1,
      disableForReducedMotion: true
    });
  },

  /**
   * Reaction emoji burst
   */
  reaction: (x: number, y: number, emoji: string) => {
    // Create a simple visual feedback for reactions
    const colors = ['#fbbf24', '#f59e0b', '#ef4444', '#3b82f6'];
    
    confetti({
      particleCount: 3,
      spread: 20,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors,
      ticks: 30,
      gravity: 1.5,
      scalar: 0.4,
      startVelocity: 10,
      disableForReducedMotion: true
    });
  }
};
