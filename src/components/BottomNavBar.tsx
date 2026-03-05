import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Swords, Plus, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

const tabs = [
  { icon: Home, label: 'HOME', path: '/' },
  { icon: Swords, label: 'BATTLES', path: '/creator-hub' },
  { isFab: true },
  { icon: BarChart3, label: 'RANKS', path: '/rankings' },
  { icon: User, label: 'PROFILE', path: '/profile' },
] as const;

export function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isBarber } = useUserRole();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleFabPress = () => {
    if (isBarber) {
      navigate('/battles/create');
    } else {
      toast('Battle creation is for barbers only');
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border/50" />

      <div className="relative flex items-end justify-around px-2 h-16">
        {tabs.map((tab, i) => {
          if ('isFab' in tab && tab.isFab) {
            return (
              <button
                key="fab"
                onClick={handleFabPress}
                className={cn(
                  'relative -mt-7 flex items-center justify-center',
                  'w-14 h-14 rounded-full',
                  'bg-primary shadow-lg shadow-primary/40',
                  'active:scale-95 transition-transform duration-100',
                )}
                aria-label="Create Battle"
              >
                <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
              </button>
            );
          }

          const { icon: Icon, label, path } = tab as { icon: typeof Home; label: string; path: string };
          const active = isActive(path);

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'transition-colors duration-150',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-label={label}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
