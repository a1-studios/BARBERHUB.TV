/**
 * Tournament Configuration
 * Central configuration for all tournament-related settings
 * 
 * ECONOMY: All transactions use Barber Bucks (BB)
 * Conversion rate: 5 BB = $1 USD
 */

export const TOURNAMENT_CONFIG = {
  // Entry Fee in BB (250 BB = $50)
  ENTRY_FEE_BB: 250,
  ENTRY_FEE_CENTS: 5000, // Legacy - for display purposes only
  CURRENCY: 'BB',
  
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
  
  // Challenge Stakes
  MIN_CHALLENGE_STAKE_BB: 100,
  PLATFORM_FEE_PERCENT: 5,
  
  // BB Conversion
  BB_PER_DOLLAR: 5,
  
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
 * Format entry fee for display (BB-based)
 */
export function formatEntryFee(): string {
  return `${TOURNAMENT_CONFIG.ENTRY_FEE_BB} BB`;
}

/**
 * Format entry fee as USD equivalent
 */
export function formatEntryFeeUSD(): string {
  const dollars = TOURNAMENT_CONFIG.ENTRY_FEE_BB / TOURNAMENT_CONFIG.BB_PER_DOLLAR;
  return `$${dollars.toFixed(0)} USD`;
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
