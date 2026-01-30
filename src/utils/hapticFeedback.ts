/**
 * Haptic Feedback Utility
 * Provides vibration patterns for various user interactions
 */

export const HapticFeedback = {
  /**
   * Short pulse for vote actions (50ms)
   */
  vote: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  /**
   * Double tap pattern for likes (50ms, 100ms pause, 50ms)
   */
  like: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  /**
   * Medium pulse for follow actions (100ms)
   */
  follow: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  },

  /**
   * Success pattern for donations (50ms, 50ms, 100ms)
   */
  donate: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 100]);
    }
  },

  /**
   * Celebration pattern for winner announcement (100ms, 50ms, 100ms, 50ms, 200ms)
   */
  winner: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  },

  /**
   * Increasing intensity for vote streaks
   * @param level - Current combo level (starts at 1)
   */
  streak: (level: number) => {
    if ('vibrate' in navigator) {
      const intensity = Math.min(50 + level * 25, 200);
      navigator.vibrate(intensity);
    }
  },

  /**
   * Error pattern (quick double buzz)
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  /**
   * Confirm pattern for swipe verification (smooth escalating)
   */
  confirm: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([25, 50, 50, 50, 75]);
    }
  }
};
