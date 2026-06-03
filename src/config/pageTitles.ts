import {
  Scissors, MapPin, Crown, Zap, Play, Trophy, User, BarChart3,
  Shield, Camera, Home, Gift, FileText, Radio, Sparkles, LucideIcon,
} from 'lucide-react';

export type PageTitle = {
  first: string;
  second: string;
  icon: LucideIcon;
  slug?: string;
};

const STATIC: Record<string, PageTitle> = {
  '/': { first: 'BARBER', second: 'HUB', icon: Home },
  '/barbers': { first: 'BARBER', second: 'DIRECTORY', icon: MapPin },
  '/creator-hub': { first: 'CREATOR', second: 'HUB', icon: Crown },
  '/portal': { first: 'BATTLE', second: 'PORTAL', icon: Zap },
  '/watch': { first: 'WATCH', second: 'FEED', icon: Play },
  '/tournaments': { first: 'TOURNAMENT', second: 'ARENA', icon: Trophy },
  '/profile': { first: 'MY', second: 'PROFILE', icon: User },
  '/rankings': { first: 'GLOBAL', second: 'RANKINGS', icon: BarChart3 },
  '/vault': { first: 'VAULT', second: 'OF HONOR', icon: Shield },
  '/studio': { first: 'CAMERA', second: 'STUDIO', icon: Camera },
  '/grants': { first: 'M4M', second: 'GRANTS', icon: Gift },
  '/analytics': { first: 'CREATOR', second: 'ANALYTICS', icon: BarChart3 },
  '/sovereign-hq': { first: 'SOVEREIGN', second: 'HQ', icon: Crown },
  '/terms': { first: 'TERMS', second: 'OF SERVICE', icon: FileText },
  '/privacy': { first: 'PRIVACY', second: 'POLICY', icon: FileText },
  '/aup': { first: 'ACCEPTABLE', second: 'USE', icon: FileText },
  '/cookies': { first: 'COOKIE', second: 'POLICY', icon: FileText },
  '/dmca': { first: 'DMCA', second: 'NOTICE', icon: FileText },
  '/coming-soon': { first: 'COMING', second: 'SOON', icon: Sparkles },
  '/live': { first: 'LIVE', second: 'CHALLENGES', icon: Radio },
};

const DEFAULT: PageTitle = { first: 'BARBER', second: 'HUB', icon: Home };

export function matchTitle(pathname: string): PageTitle {
  if (STATIC[pathname]) return { ...STATIC[pathname], slug: STATIC[pathname].slug ?? labelFor(STATIC[pathname]) };

  // Dynamic patterns
  if (/^\/barber\/[^/]+/.test(pathname)) return { first: 'BARBER', second: 'PROFILE', icon: User };
  if (/^\/battle\/[^/]+\/contender/.test(pathname)) return { first: 'CONTENDER', second: 'THEATER', icon: Zap };
  if (/^\/battle\/[^/]+\/theater/.test(pathname)) return { first: 'BATTLE', second: 'THEATER', icon: Play };
  if (/^\/battles\/[^/]+/.test(pathname)) return { first: 'BATTLE', second: 'DETAILS', icon: Zap };
  if (/^\/tournaments\/[^/]+/.test(pathname)) return { first: 'TOURNAMENT', second: 'DETAILS', icon: Trophy };
  if (/^\/broadcast\/[^/]+\/studio/.test(pathname)) return { first: 'BROADCAST', second: 'STUDIO', icon: Radio };
  if (/^\/broadcast\/[^/]+/.test(pathname)) return { first: 'LIVE', second: 'BROADCAST', icon: Radio };
  if (/^\/book-barber/.test(pathname)) return { first: 'BOOK', second: 'A BARBER', icon: Scissors };
  if (pathname.startsWith('/admin')) return { first: 'ADMIN', second: 'CONTROL', icon: Shield };

  return DEFAULT;
}

function labelFor(t: PageTitle) {
  return `${t.first} ${t.second}`.toLowerCase();
}
