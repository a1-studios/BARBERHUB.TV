/**
 * Tournament Configuration
 * Central configuration for all tournament-related settings
 */

export const TOURNAMENT_CONFIG = {
  // Entry Fee
  ENTRY_FEE_CENTS: 5000, // $50.00
  CURRENCY: 'USD',
  
  // Battle Settings
  BATTLE_DURATION_MINUTES: 45,
  TIMEZONE: 'America/New_York', // Eastern Time
  
  // Battle Sunday Schedule
  BATTLE_SUNDAY: {
    DAY_OF_WEEK: 0, // Sunday
    START_HOUR: 10, // 10 AM ET
    START_MINUTE: 0,
  },
  
  // Queue Settings
  QUEUE_EXPIRY_HOURS: 168, // 7 days (one week)
  MAX_QUEUE_SIZE_PER_CATEGORY: 100,
  
  // Prize Distribution (TBD - to be configured later)
  PRIZE_DISTRIBUTION: {
    enabled: false,
    // Will be configured based on total prize pool
    percentages: {
      first: 0,
      second: 0,
      third: 0,
      // ... etc
    }
  },
  
  // Matchmaking Settings
  MATCHMAKING: {
    PREFER_INTERNATIONAL: true, // Prioritize different countries
    MIN_QUEUE_SIZE_FOR_MATCHING: 2,
    MAX_WAIT_TIME_HOURS: 168, // Max 1 week wait
  },
  
  // Notification Settings
  NOTIFICATIONS: {
    MATCH_FOUND: true,
    BATTLE_STARTING_SOON: true,
    BATTLE_STARTING_HOURS_NOTICE: 24, // Notify 24h before
    PAYMENT_CONFIRMED: true,
  }
} as const;

/**
 * Get the next Battle Sunday timestamp
 */
export function getNextBattleSunday(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(TOURNAMENT_CONFIG.BATTLE_SUNDAY.START_HOUR, TOURNAMENT_CONFIG.BATTLE_SUNDAY.START_MINUTE, 0, 0);
  
  return nextSunday;
}

/**
 * Calculate battle end time based on duration
 */
export function calculateBattleEndTime(startTime: Date): Date {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + TOURNAMENT_CONFIG.BATTLE_DURATION_MINUTES);
  return endTime;
}

/**
 * Format entry fee for display
 */
export function formatEntryFee(): string {
  const dollars = TOURNAMENT_CONFIG.ENTRY_FEE_CENTS / 100;
  return `$${dollars.toFixed(2)} ${TOURNAMENT_CONFIG.CURRENCY}`;
}

/**
 * Check if queue entry has expired
 */
export function isQueueEntryExpired(queueTimestamp: string): boolean {
  const queueTime = new Date(queueTimestamp);
  const now = new Date();
  const hoursDiff = (now.getTime() - queueTime.getTime()) / (1000 * 60 * 60);
  return hoursDiff > TOURNAMENT_CONFIG.QUEUE_EXPIRY_HOURS;
}
