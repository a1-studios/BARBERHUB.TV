/**
 * Country Celebration Utility
 * Cultural data and explosive celebration effects for Arena Gate
 */

import confetti from 'canvas-confetti';
import { HapticFeedback } from './hapticFeedback';

export interface CountryCulturalData {
  colors: string[];           // Flag colors for confetti
  hypePhrase: string;         // Cultural hype phrase
  celebrationEmoji: string;   // Cultural emoji
}

// Map of country codes to cultural celebration data
export const COUNTRY_CULTURAL_DATA: Record<string, CountryCulturalData> = {
  // Americas
  US: { colors: ['#B31942', '#FFFFFF', '#0A3161'], hypePhrase: "Let's Go!", celebrationEmoji: '🦅' },
  BR: { colors: ['#009739', '#FEDD00', '#002776'], hypePhrase: "Vamos!", celebrationEmoji: '🔥' },
  MX: { colors: ['#006847', '#FFFFFF', '#CE1126'], hypePhrase: "¡Órale!", celebrationEmoji: '🌮' },
  AR: { colors: ['#74ACDF', '#FFFFFF', '#F6B40E'], hypePhrase: "¡Vamos!", celebrationEmoji: '⚽' },
  CA: { colors: ['#FF0000', '#FFFFFF'], hypePhrase: "Let's Go!", celebrationEmoji: '🍁' },
  JM: { colors: ['#009B3A', '#FED100', '#000000'], hypePhrase: "Yah Mon!", celebrationEmoji: '🎶' },
  CO: { colors: ['#FCD116', '#003893', '#CE1126'], hypePhrase: "¡Dale!", celebrationEmoji: '☕' },
  CL: { colors: ['#0039A6', '#FFFFFF', '#D52B1E'], hypePhrase: "¡Vamos!", celebrationEmoji: '🏔️' },
  PE: { colors: ['#D91023', '#FFFFFF'], hypePhrase: "¡Arriba!", celebrationEmoji: '🦙' },
  VE: { colors: ['#FFCC00', '#0033A0', '#CF142B'], hypePhrase: "¡Échale!", celebrationEmoji: '🌴' },
  CU: { colors: ['#002590', '#FFFFFF', '#CF142B'], hypePhrase: "¡Dale!", celebrationEmoji: '🎺' },
  DO: { colors: ['#002D62', '#CE1126', '#FFFFFF'], hypePhrase: "¡Wepa!", celebrationEmoji: '🌴' },
  PR: { colors: ['#0050F0', '#FFFFFF', '#EF0000'], hypePhrase: "¡Wepa!", celebrationEmoji: '🇵🇷' },
  
  // Europe
  GB: { colors: ['#012169', '#C8102E', '#FFFFFF'], hypePhrase: "Brilliant!", celebrationEmoji: '👑' },
  FR: { colors: ['#0055A4', '#FFFFFF', '#EF4135'], hypePhrase: "Allez!", celebrationEmoji: '🗼' },
  DE: { colors: ['#000000', '#DD0000', '#FFCE00'], hypePhrase: "Los Geht's!", celebrationEmoji: '🦅' },
  ES: { colors: ['#AA151B', '#F1BF00'], hypePhrase: "¡Vamos!", celebrationEmoji: '💃' },
  IT: { colors: ['#008C45', '#FFFFFF', '#CD212A'], hypePhrase: "Andiamo!", celebrationEmoji: '🤌' },
  NL: { colors: ['#AE1C28', '#FFFFFF', '#21468B'], hypePhrase: "Kom Op!", celebrationEmoji: '🌷' },
  PT: { colors: ['#006600', '#FF0000', '#FFCC00'], hypePhrase: "Vamos!", celebrationEmoji: '⚽' },
  BE: { colors: ['#000000', '#FDDA24', '#EF3340'], hypePhrase: "Allez!", celebrationEmoji: '🍺' },
  CH: { colors: ['#FF0000', '#FFFFFF'], hypePhrase: "Hopp!", celebrationEmoji: '🏔️' },
  AT: { colors: ['#ED2939', '#FFFFFF'], hypePhrase: "Los!", celebrationEmoji: '🎵' },
  SE: { colors: ['#006AA7', '#FECC00'], hypePhrase: "Kör!", celebrationEmoji: '🦌' },
  NO: { colors: ['#BA0C2F', '#00205B', '#FFFFFF'], hypePhrase: "Kjør!", celebrationEmoji: '🎿' },
  DK: { colors: ['#C8102E', '#FFFFFF'], hypePhrase: "Kom Så!", celebrationEmoji: '🧜' },
  FI: { colors: ['#002F6C', '#FFFFFF'], hypePhrase: "Sisu!", celebrationEmoji: '❄️' },
  IE: { colors: ['#169B62', '#FFFFFF', '#FF883E'], hypePhrase: "Come On!", celebrationEmoji: '☘️' },
  PL: { colors: ['#FFFFFF', '#DC143C'], hypePhrase: "Dawaj!", celebrationEmoji: '🦅' },
  RU: { colors: ['#FFFFFF', '#0039A6', '#D52B1E'], hypePhrase: "Davai!", celebrationEmoji: '🐻' },
  UA: { colors: ['#0057B7', '#FFD700'], hypePhrase: "Slava!", celebrationEmoji: '🌻' },
  GR: { colors: ['#0D5EAF', '#FFFFFF'], hypePhrase: "Pame!", celebrationEmoji: '🏛️' },
  TR: { colors: ['#E30A17', '#FFFFFF'], hypePhrase: "Haydi!", celebrationEmoji: '🌙' },
  
  // Africa
  NG: { colors: ['#008751', '#FFFFFF'], hypePhrase: "Na We!", celebrationEmoji: '🦁' },
  GH: { colors: ['#006B3F', '#FCD116', '#CE1126'], hypePhrase: "Ayeeko!", celebrationEmoji: '⭐' },
  ZA: { colors: ['#007749', '#FFB81C', '#DE3831', '#002395', '#000000', '#FFFFFF'], hypePhrase: "Sho!", celebrationEmoji: '🦁' },
  KE: { colors: ['#000000', '#BB0000', '#008000', '#FFFFFF'], hypePhrase: "Tuko Pamoja!", celebrationEmoji: '🦁' },
  EG: { colors: ['#CE1126', '#FFFFFF', '#000000'], hypePhrase: "Yalla!", celebrationEmoji: '🏛️' },
  MA: { colors: ['#C1272D', '#006233'], hypePhrase: "Yalla!", celebrationEmoji: '🌴' },
  ET: { colors: ['#009A49', '#FCDD09', '#DA121A'], hypePhrase: "Enihid!", celebrationEmoji: '☕' },
  TZ: { colors: ['#1EB53A', '#FCD116', '#00A3DD', '#000000'], hypePhrase: "Twende!", celebrationEmoji: '🏔️' },
  CI: { colors: ['#F77F00', '#FFFFFF', '#009E60'], hypePhrase: "On Y Va!", celebrationEmoji: '🐘' },
  SN: { colors: ['#00853F', '#FDEF42', '#E31B23'], hypePhrase: "Dem Dem!", celebrationEmoji: '🦁' },
  CM: { colors: ['#007A5E', '#CE1126', '#FCD116'], hypePhrase: "Allez!", celebrationEmoji: '🦁' },
  
  // Asia
  JP: { colors: ['#BC002D', '#FFFFFF'], hypePhrase: "Ikuzo!", celebrationEmoji: '🌸' },
  KR: { colors: ['#0047A0', '#C60C30', '#FFFFFF', '#000000'], hypePhrase: "Hwaiting!", celebrationEmoji: '🔥' },
  CN: { colors: ['#DE2910', '#FFDE00'], hypePhrase: "Jiayou!", celebrationEmoji: '🐉' },
  IN: { colors: ['#FF9933', '#FFFFFF', '#138808', '#000080'], hypePhrase: "Chalo!", celebrationEmoji: '🪔' },
  PH: { colors: ['#0038A8', '#CE1126', '#FCD116', '#FFFFFF'], hypePhrase: "Tara!", celebrationEmoji: '⭐' },
  ID: { colors: ['#FF0000', '#FFFFFF'], hypePhrase: "Ayo!", celebrationEmoji: '🌴' },
  TH: { colors: ['#A51931', '#F4F5F8', '#2D2A4A'], hypePhrase: "Pai!", celebrationEmoji: '🐘' },
  VN: { colors: ['#DA251D', '#FFFF00'], hypePhrase: "Đi Thôi!", celebrationEmoji: '🌺' },
  MY: { colors: ['#010066', '#CC0001', '#FFFFFF', '#FFCC00'], hypePhrase: "Jom!", celebrationEmoji: '🌴' },
  SG: { colors: ['#ED2939', '#FFFFFF'], hypePhrase: "Let's Go!", celebrationEmoji: '🦁' },
  PK: { colors: ['#01411C', '#FFFFFF'], hypePhrase: "Chalo!", celebrationEmoji: '🌙' },
  BD: { colors: ['#006A4E', '#F42A41'], hypePhrase: "Cholo!", celebrationEmoji: '🌺' },
  
  // Middle East
  AE: { colors: ['#00732F', '#FFFFFF', '#000000', '#FF0000'], hypePhrase: "Yalla!", celebrationEmoji: '🏜️' },
  SA: { colors: ['#006C35', '#FFFFFF'], hypePhrase: "Yalla!", celebrationEmoji: '🕌' },
  QA: { colors: ['#8D1B3D', '#FFFFFF'], hypePhrase: "Yalla!", celebrationEmoji: '🏟️' },
  IL: { colors: ['#0038B8', '#FFFFFF'], hypePhrase: "Yalla!", celebrationEmoji: '⭐' },
  LB: { colors: ['#ED1C24', '#FFFFFF', '#00A651'], hypePhrase: "Yalla!", celebrationEmoji: '🌲' },
  JO: { colors: ['#000000', '#FFFFFF', '#007A33', '#CE1126'], hypePhrase: "Yalla!", celebrationEmoji: '🏜️' },
  IR: { colors: ['#239F40', '#FFFFFF', '#DA0000'], hypePhrase: "Berim!", celebrationEmoji: '🌹' },
  
  // Caribbean
  TT: { colors: ['#DA2127', '#FFFFFF', '#000000'], hypePhrase: "Leh We Go!", celebrationEmoji: '🎭' },
  BB: { colors: ['#00267F', '#FFC726'], hypePhrase: "Come On!", celebrationEmoji: '🌴' },
  BS: { colors: ['#00ABC9', '#FFD520', '#000000'], hypePhrase: "Let's Go!", celebrationEmoji: '🌴' },
  HT: { colors: ['#00209F', '#D21034'], hypePhrase: "Alè!", celebrationEmoji: '🌴' },
  
  // Oceania
  AU: { colors: ['#00008B', '#FFFFFF', '#FF0000'], hypePhrase: "Let's Go!", celebrationEmoji: '🦘' },
  NZ: { colors: ['#00247D', '#CC142B', '#FFFFFF'], hypePhrase: "Ka Pai!", celebrationEmoji: '🥝' },
  FJ: { colors: ['#009FE0', '#FFFFFF', '#CE1126'], hypePhrase: "Bula!", celebrationEmoji: '🌴' },
};

// Default fallback for countries without specific data
export const DEFAULT_CULTURAL_DATA: CountryCulturalData = {
  colors: ['#f97316', '#00D9FF', '#22c55e'],  // Platform colors
  hypePhrase: "Let's Go!",
  celebrationEmoji: '🔥'
};

export const getCountryCulturalData = (code: string): CountryCulturalData => {
  return COUNTRY_CULTURAL_DATA[code] || DEFAULT_CULTURAL_DATA;
};

/**
 * Trigger explosive country celebration with confetti and haptics
 */
export const triggerCountryCelebration = (countryCode: string): CountryCulturalData => {
  const cultural = getCountryCulturalData(countryCode);
  
  // 1. MASSIVE confetti burst in flag colors
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.5, x: 0.5 },
    colors: cultural.colors,
    ticks: 120,
    gravity: 0.8,
    scalar: 1.2,
    disableForReducedMotion: true
  });

  // 2. Side cannons with flag colors
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.5 },
      colors: cultural.colors,
      ticks: 100,
      disableForReducedMotion: true
    });
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.5 },
      colors: cultural.colors,
      ticks: 100,
      disableForReducedMotion: true
    });
  }, 150);

  // 3. Top explosion
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 270,
      spread: 80,
      origin: { x: 0.5, y: 0 },
      colors: cultural.colors,
      ticks: 80,
      startVelocity: 45,
      disableForReducedMotion: true
    });
  }, 300);

  // 4. Haptic celebration
  HapticFeedback.winner();
  
  return cultural;
};
