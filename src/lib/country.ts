/**
 * Country code normalization and flag utilities
 */

// Common country code aliases and mappings
const COUNTRY_ALIASES: Record<string, string> = {
  'DR': 'DO',  // Dominican Republic
  'UK': 'GB',  // United Kingdom
  'UAE': 'AE', // United Arab Emirates
  'KSA': 'SA', // Kingdom of Saudi Arabia
  'USA': 'US', // United States
  'ENG': 'GB', // England
  'SCO': 'GB', // Scotland
  'WAL': 'GB', // Wales
  'DOM': 'DO', // Dominican Republic (3-letter)
};

// Common country name to code mappings
const COUNTRY_NAMES: Record<string, string> = {
  'dominican republic': 'DO',
  'republica dominicana': 'DO',
  'united states': 'US',
  'united kingdom': 'GB',
  'united arab emirates': 'AE',
  'saudi arabia': 'SA',
};

/**
 * Normalize country code with fuzzy matching and alias resolution
 */
export function normalizeCountryCode(
  input: string | null | undefined,
  context?: { name?: string; location?: string }
): string {
  // Handle empty/null input
  if (!input?.trim()) {
    // Try to infer from context
    if (context?.name || context?.location) {
      const contextStr = `${context.name || ''} ${context.location || ''}`.toLowerCase();
      
      // Check for Dominican Republic indicators
      if (contextStr.includes('dominican') || contextStr.includes('rd') || contextStr.includes('republica dominicana')) {
        return 'DO';
      }
      
      // Check other country names
      for (const [name, code] of Object.entries(COUNTRY_NAMES)) {
        if (contextStr.includes(name)) {
          return code;
        }
      }
    }
    return 'XX';
  }

  const normalized = input.trim().toUpperCase();

  // Check aliases first
  if (COUNTRY_ALIASES[normalized]) {
    return COUNTRY_ALIASES[normalized];
  }

  // Valid 2-letter ISO code
  if (normalized.length === 2 && /^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Check country names
  const lowerInput = input.trim().toLowerCase();
  if (COUNTRY_NAMES[lowerInput]) {
    return COUNTRY_NAMES[lowerInput];
  }

  // Unknown format
  return 'XX';
}

/**
 * Get flag image URL from FlagCDN
 */
export function getFlagUrl(code: string, size: 'w20' | 'w40' | 'w80' | 'w160' | 'w320' = 'w40'): string {
  const normalized = normalizeCountryCode(code);
  if (normalized === 'XX') {
    return ''; // No flag available
  }
  return `https://flagcdn.com/${size}/${normalized.toLowerCase()}.png`;
}

/**
 * Get flag emoji (fallback for invalid codes)
 */
export function getFlagEmoji(code: string): string {
  const normalized = normalizeCountryCode(code);
  if (normalized === 'XX') {
    return '🌍';
  }

  const codePoints = normalized
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
