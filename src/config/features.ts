// Feature flags to control which elements appear in the app

// 🔴 MASTER SWITCH — set to false before going live
export const DEV_MODE = true;

export const FEATURES = {
  // Header elements
  HEADER_INSTAGRAM_FOLLOW: false,
  HEADER_MOBILE_QUICK_MENU: false,
  
  // Main sections
  GRANTS_SECTION: false,
  COMMUNITY_LEADERBOARD: true,
  
  // Creator system
  CREATOR_HUB_ENABLED: true,
  BARBER_BUCKS_SYSTEM: true,
  REFERRAL_PROGRAM: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;