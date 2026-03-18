export interface SpecialtyTag {
  id: string;
  label: string;
  emoji: string;
}

export const SPECIALTY_TAGS: SpecialtyTag[] = [
  { id: 'fades', label: 'Fades', emoji: '✂️' },
  { id: 'classic', label: 'Classic Cuts', emoji: '💈' },
  { id: 'beard', label: 'Beard Styling', emoji: '🧔' },
  { id: 'color', label: 'Hair Color', emoji: '🎨' },
  { id: 'texture', label: 'Texture Work', emoji: '🌀' },
  { id: 'creative', label: 'Creative Styles', emoji: '🔥' },
  { id: 'kids', label: 'Kids Cuts', emoji: '👶' },
  { id: 'womens', label: "Women's Cuts", emoji: '💇‍♀️' },
  { id: 'razor', label: 'Straight Razor', emoji: '🪒' },
  { id: 'luxury', label: 'Luxury Grooming', emoji: '💎' },
];

export const MAX_SPECIALTIES = 3;

/** Convert comma-separated specialty string to array of IDs */
export function parseSpecialties(specialty: string | null | undefined): string[] {
  if (!specialty) return [];
  return specialty.split(',').map(s => s.trim()).filter(Boolean);
}

/** Convert array of IDs to comma-separated string for DB storage */
export function serializeSpecialties(ids: string[]): string {
  return ids.join(',');
}

/** Get display info for a specialty ID */
export function getSpecialtyDisplay(id: string): SpecialtyTag | undefined {
  return SPECIALTY_TAGS.find(t => t.id === id);
}
