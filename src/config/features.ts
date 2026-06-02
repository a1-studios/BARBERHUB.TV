// Feature flags to control which elements appear in the app

// 🔴 LEGACY constant — kept for backward compatibility only.
// Runtime developer mode is now controlled from Sovereign HQ via
// the `dev_mode` platform_state flag. Use `useDevMode()` instead.
export const DEV_MODE = false;

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

  // Add-on modules
  CHAIR_SWAP_ENABLED: true,
  HUB_CALENDAR_ENABLED: true,
  INTAKE_DUAL_IMAGE_ENABLED: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
