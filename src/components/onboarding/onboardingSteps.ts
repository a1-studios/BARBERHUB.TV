import { Calendar, Play, Trophy, Eye, Vote, DollarSign, type LucideIcon } from 'lucide-react';

export interface OnboardingStep {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string; // tailwind text color for icon
}

export const barberFlow: OnboardingStep[] = [
  {
    icon: Calendar,
    title: 'Register for Battles',
    description: 'Pick your category, pay the entry fee, and get matched with an opponent.',
    accent: 'text-orange-400',
  },
  {
    icon: Play,
    title: 'Go Live on Battle Day',
    description: 'Stream your 1-hour haircut live from your shop every Sunday.',
    accent: 'text-cyan-400',
  },
  {
    icon: Trophy,
    title: 'Win & Climb Rankings',
    description: 'Earn points, collect Barber Bucks, and qualify for the Grand Final.',
    accent: 'text-yellow-400',
  },
];

export const fanFlow: OnboardingStep[] = [
  {
    icon: Eye,
    title: 'Watch Live Battles',
    description: 'Split-screen competitions between top barbers worldwide.',
    accent: 'text-orange-400',
  },
  {
    icon: Vote,
    title: 'Vote for Winners',
    description: 'Cast your vote and help decide who takes the crown.',
    accent: 'text-cyan-400',
  },
  {
    icon: DollarSign,
    title: 'Support Barbers',
    description: 'Donate Barber Bucks, react, and chat during live streams.',
    accent: 'text-green-400',
  },
];
