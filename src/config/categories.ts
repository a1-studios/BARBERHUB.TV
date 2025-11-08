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
}

export const TOURNAMENT_CATEGORIES: TournamentCategory[] = [
  {
    id: 'speed_fade',
    name: 'Technical Precision: The Speed Fade',
    shortName: 'Speed Fade',
    description: 'Showcase your technical mastery with precision fades executed at lightning speed',
    icon: '⚡'
  },
  {
    id: 'gentleman_cut',
    name: 'Classic Artistry: The Gentleman\'s Cut',
    shortName: 'Gentleman\'s Cut',
    description: 'Demonstrate timeless barbering skills with classic, sophisticated cuts',
    icon: '👔'
  },
  {
    id: 'creative_color',
    name: 'Avant-Garde: Creative Color & Design',
    shortName: 'Creative Color',
    description: 'Push boundaries with innovative color techniques and artistic hair design',
    icon: '🎨'
  },
  {
    id: 'viral_trending',
    name: 'Social Sensation: Viral & Trending Styles',
    shortName: 'Viral Styles',
    description: 'Create the next viral haircut trend that captures social media attention',
    icon: '📱'
  },
  {
    id: 'beard_scissor',
    name: 'Technical Beard & Scissor Craft',
    shortName: 'Beard & Scissor',
    description: 'Master the art of beard grooming and precision scissor work',
    icon: '✂️'
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
