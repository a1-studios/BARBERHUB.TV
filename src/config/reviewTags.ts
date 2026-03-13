export interface ReviewTag {
  slug: string;
  label: string;
  emoji: string;
  is_negative: boolean;
  is_internal: boolean;
}

// Tags fans use to review barbers (public)
export const BARBER_REVIEW_TAGS: ReviewTag[] = [
  { slug: 'precision-king', label: 'Precision King', emoji: '👑', is_negative: false, is_internal: false },
  { slug: 'ultra-clean', label: 'Ultra Clean', emoji: '✨', is_negative: false, is_internal: false },
  { slug: 'fast-work', label: 'Fast Work', emoji: '⚡', is_negative: false, is_internal: false },
  { slug: 'great-vibes', label: 'Great Vibes', emoji: '🎶', is_negative: false, is_internal: false },
  { slug: 'creative-stylist', label: 'Creative Stylist', emoji: '🎨', is_negative: false, is_internal: false },
  { slug: 'patient-listener', label: 'Patient Listener', emoji: '👂', is_negative: false, is_internal: false },
  { slug: 'on-time', label: 'On Time', emoji: '⏰', is_negative: false, is_internal: false },
  { slug: 'pro-service', label: 'Pro Service', emoji: '🤝', is_negative: false, is_internal: false },
  { slug: 'ran-late', label: 'Ran Late', emoji: '🕐', is_negative: true, is_internal: false },
  { slug: 'rushed-cut', label: 'Rushed Cut', emoji: '💨', is_negative: true, is_internal: false },
  { slug: 'messy-station', label: 'Messy Station', emoji: '🧹', is_negative: true, is_internal: false },
  { slug: 'bad-communication', label: 'Bad Communication', emoji: '🔇', is_negative: true, is_internal: false },
  { slug: 'rough-handling', label: 'Rough Handling', emoji: '🔪', is_negative: true, is_internal: false },
];

// Tags barbers use to review clients (internal only)
export const CLIENT_REVIEW_TAGS: ReviewTag[] = [
  { slug: 'respectful', label: 'Respectful', emoji: '🤝', is_negative: false, is_internal: true },
  { slug: 'on-time-client', label: 'On Time', emoji: '⏰', is_negative: false, is_internal: true },
  { slug: 'good-tipper', label: 'Good Tipper', emoji: '💰', is_negative: false, is_internal: true },
  { slug: 'easy-going', label: 'Easy Going', emoji: '😎', is_negative: false, is_internal: true },
  { slug: 'repeat-client', label: 'Repeat Client', emoji: '🔄', is_negative: false, is_internal: true },
  { slug: 'frequent-flyer', label: 'Frequent Flyer', emoji: '🚶‍♂️', is_negative: false, is_internal: true },
  { slug: 'peaceful-client', label: 'Peaceful Client', emoji: '🕊️', is_negative: false, is_internal: true },
  { slug: 'no-show-risk', label: 'No-Show Risk', emoji: '🚩', is_negative: true, is_internal: true },
  { slug: 'chronic-lateness', label: 'Chronic Lateness', emoji: '⏳', is_negative: true, is_internal: true },
  { slug: 'aggressive', label: 'Aggressive', emoji: '😤', is_negative: true, is_internal: true },
  { slug: 'unrealistic-expectations', label: 'Unrealistic Expects', emoji: '🌙', is_negative: true, is_internal: true },
  { slug: 'high-maintenance', label: 'High Maintenance', emoji: '🧐', is_negative: true, is_internal: true },
];
