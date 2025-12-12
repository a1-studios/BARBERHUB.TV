/**
 * Tournament Categories Configuration
 * Standardized 5-category system for Barber Hub Seasonal Tournaments
 */

export interface TournamentCategory {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  colorTheme: {
    primary: string;
    secondary: string;
    glow: string;
    gradient: string;
  };
  vibe: string;
}

export const TOURNAMENT_CATEGORIES: TournamentCategory[] = [
  {
    id: 'speed_fade',
    name: 'Technical Precision: The Speed Fade',
    shortName: 'Speed Fade',
    description: 'Showcase your technical mastery with precision fades executed at lightning speed',
    icon: '⚡',
    colorTheme: {
      primary: 'hsl(195, 100%, 50%)',
      secondary: 'hsl(195, 100%, 70%)',
      glow: 'hsl(195, 100%, 50%)',
      gradient: 'from-cyan-500 via-cyan-400 to-blue-500'
    },
    vibe: 'Fast, Technical, Precision'
  },
  {
    id: 'gentleman_cut',
    name: 'Classic Artistry: The Gentleman\'s Cut',
    shortName: 'Gentleman\'s Cut',
    description: 'Demonstrate timeless barbering skills with classic, sophisticated cuts',
    icon: '👔',
    colorTheme: {
      primary: 'hsl(43, 100%, 50%)',
      secondary: 'hsl(43, 80%, 70%)',
      glow: 'hsl(43, 100%, 50%)',
      gradient: 'from-amber-500 via-yellow-400 to-orange-500'
    },
    vibe: 'Classic, Elegant, Timeless'
  },
  {
    id: 'creative_color',
    name: 'Avant-Garde: Creative Color & Design',
    shortName: 'Creative Color',
    description: 'Push boundaries with innovative color techniques and artistic hair design',
    icon: '🎨',
    colorTheme: {
      primary: 'hsl(300, 100%, 50%)',
      secondary: 'hsl(180, 100%, 50%)',
      glow: 'hsl(300, 100%, 60%)',
      gradient: 'from-pink-500 via-purple-500 to-cyan-500'
    },
    vibe: 'Bold, Artistic, Avant-garde'
  },
  {
    id: 'viral_trending',
    name: 'Social Sensation: Viral & Trending Styles',
    shortName: 'Viral Styles',
    description: 'Create the next viral haircut trend that captures social media attention',
    icon: '📱',
    colorTheme: {
      primary: 'hsl(330, 100%, 60%)',
      secondary: 'hsl(180, 100%, 50%)',
      glow: 'hsl(330, 100%, 70%)',
      gradient: 'from-pink-500 via-rose-400 to-cyan-400'
    },
    vibe: 'Trendy, Social, Viral'
  },
  {
    id: 'beard_scissor',
    name: 'Technical Beard & Scissor Craft',
    shortName: 'Beard & Scissor',
    description: 'Master the art of beard grooming and precision scissor work',
    icon: '✂️',
    colorTheme: {
      primary: 'hsl(0, 0%, 75%)',
      secondary: 'hsl(0, 0%, 90%)',
      glow: 'hsl(0, 0%, 80%)',
      gradient: 'from-slate-400 via-gray-300 to-zinc-500'
    },
    vibe: 'Craftsmanship, Detail, Precision'
  }
];

export const getCategoryById = (id: string): TournamentCategory | undefined => {
  return TOURNAMENT_CATEGORIES.find(cat => cat.id === id);
};

export const getCategoryByName = (name: string): TournamentCategory | undefined => {
  return TOURNAMENT_CATEGORIES.find(
    cat => cat.name === name || cat.shortName === name || cat.id === name
  );
};
