import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Plus, BarChart3, User, Play, Scissors, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const barberTabs = [
  { icon: Home, label: 'HOME', path: '/' },
  { icon: Play, label: 'WATCH', path: '/watch' },
  { isFab: true },
  { icon: Radio, label: 'LIVE', path: '/live' },
  { icon: User, label: 'PROFILE', path: '/profile' },
] as const;

const fanTabs = [
  { icon: Home, label: 'HOME', path: '/' },
  { icon: Play, label: 'WATCH', path: '/watch' },
  { isFab: true },
  { icon: Radio, label: 'LIVE', path: '/live' },
  { icon: User, label: 'PROFILE', path: '/profile' },
] as const;

export function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isBarber } = useUserRole();
  const { user } = useAuth();

  // Check if any followed barber is live
  const { data: hasLiveFollowed } = useQuery({
    queryKey: ['followed-live-count', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data: follows } = await supabase
        .from('creator_follows')
        .select('creator_id')
        .eq('follower_id', user.id);

      if (!follows || follows.length === 0) return false;

      const followedIds = follows.map(f => f.creator_id);
      const { count } = await supabase
        .from('barber_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_live', true)
        .in('user_id', followedIds);

      return (count || 0) > 0;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const tabs = isBarber ? barberTabs : fanTabs;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleFabPress = () => {
    if (isBarber) {
      navigate('/battles/create');
    } else {
      navigate('/barbers');
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/70 backdrop-blur-xl shadow-[0_-8px_24px_-8px_hsl(var(--cyan)/0.35)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/70 to-transparent" />
      <div className="relative flex items-end justify-around px-2 h-11">
        {tabs.map((tab, i) => {
          if ('isFab' in tab && tab.isFab) {
            const FabIcon = isBarber ? Plus : Scissors;
            return (
              <button
                key="fab"
                onClick={handleFabPress}
                className={cn(
                  'relative -mt-5 flex items-center justify-center',
                  'w-10 h-10 rounded-full ring-1 ring-cyan/40',
                  'bg-primary shadow-lg shadow-primary/40',
                  'active:scale-95 transition-transform duration-100',
                )}
                aria-label={isBarber ? 'Create Battle' : 'Book a Barber'}
              >
                <FabIcon className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
              </button>
            );
          }

          const { icon: Icon, label, path } = tab as { icon: typeof Home; label: string; path: string };
          const active = isActive(path);
          const showLiveDot = (path === '/' || path === '/live') && hasLiveFollowed;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0 flex-1 h-full',
                'transition-colors duration-150 drop-shadow-lg',
                active ? 'text-primary' : 'text-white/80',
              )}
              aria-label={label}
            >
              <div className="relative">
                <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.5 : 2} />
                {showLiveDot && (
                  <div className="absolute -top-0.5 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-background" />
                )}
              </div>
              <span className="text-[8px] font-semibold tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
