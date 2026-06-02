import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Button } from '@/components/ui/button';
import { 
  Swords, 
  Plus, 
  User, 
  Crown, 
  Coins,
  Zap,
  Loader2,
  Shield,
  Trophy,
  Camera,
  Calendar,
  Armchair
} from 'lucide-react';
import { FEATURES } from '@/config/features';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  requiresAuth: boolean;
  barberOnly?: boolean;
  adminOnly?: boolean;
  onClick?: () => void;
  highlight?: boolean;
}

export function QuickActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { isBarber, isAdmin } = useUserRole();
  const { barberBucks, isLoading: bbLoading, setShowAddFundsModal } = useBarberBucks();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'barber-bucks',
      label: bbLoading ? 'Loading...' : `${barberBucks.toLocaleString()} BB`,
      icon: bbLoading ? <Loader2 className="w-5 h-5 animate-spin text-yellow-500" /> : <Coins className="w-5 h-5 text-yellow-500" />,
      requiresAuth: true,
      onClick: () => setShowAddFundsModal(true),
      highlight: true
    },
    {
      id: 'add-funds',
      label: 'Add Funds',
      icon: <Plus className="w-5 h-5 text-green-500" />,
      requiresAuth: true,
      onClick: () => setShowAddFundsModal(true)
    },
    {
      id: 'portal',
      label: 'Battle Portal',
      icon: <Trophy className="w-5 h-5 text-primary" />,
      path: '/portal',
      requiresAuth: true,
      barberOnly: true
    },
    {
      id: 'battles',
      label: 'Watch Battles',
      icon: <Swords className="w-5 h-5" />,
      path: '/watch',
      requiresAuth: true
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
      path: '/profile',
      requiresAuth: true
    },
    {
      id: 'creator-hub',
      label: 'Creator Hub',
      icon: <Crown className="w-5 h-5" />,
      path: '/creator-hub',
      requiresAuth: true,
      barberOnly: true
    },
    {
      id: 'camera-studio',
      label: 'Camera Studio',
      icon: <Camera className="w-5 h-5 text-primary" />,
      path: '/studio',
      requiresAuth: true,
      barberOnly: true
    },
    ...(FEATURES.HUB_CALENDAR_ENABLED ? [{
      id: 'hub-calendar',
      label: 'Calendar',
      icon: <Calendar className="w-5 h-5 text-[hsl(187,80%,55%)]" />,
      path: '/hub/calendar',
      requiresAuth: true,
    } as QuickAction] : []),
    ...(FEATURES.CHAIR_SWAP_ENABLED ? [{
      id: 'chair-swap',
      label: 'Chair Swap',
      icon: <Armchair className="w-5 h-5 text-primary" />,
      path: '/chair-swap',
      requiresAuth: true,
      barberOnly: true,
    } as QuickAction] : []),
    {
      id: 'admin-dashboard',
      label: 'Admin Dashboard',
      icon: <Zap className="w-5 h-5 text-red-500" />,
      path: '/admin',
      requiresAuth: true,
      adminOnly: true
    }
  ];

  // Filter actions based on auth and user type
  const availableActions = quickActions.filter(action => {
    if (action.requiresAuth && !user) return false;
    if (action.barberOnly && !isBarber) return false;
    if (action.adminOnly && !isAdmin) return false;
    return true;
  });

  const handleActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
      setIsOpen(false);
      return;
    }
    
    if (action.requiresAuth && !user) {
      navigate('/');
      setIsOpen(false);
      return;
    }
    
    if (action.path) {
      navigate(action.path);
    }
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50">
      {/* Actions Menu */}
      {isOpen && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 mb-2">
          <div className="flex flex-col items-center space-y-2 animate-scale-in">
            {availableActions.map((action, index) => (
              <Button
                key={action.id}
                onClick={() => handleActionClick(action)}
                variant="default"
                size="sm"
                className={cn(
                  "w-44 justify-start gap-3 bg-card/95 backdrop-blur-sm",
                  "border border-border/50 hover:border-primary/50",
                  "shadow-lg hover:shadow-glow",
                  "transition-all duration-300",
                  "animate-slide-in-right",
                  action.highlight && "bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border-yellow-500/30 hover:border-yellow-500/50",
                  action.adminOnly && "border-red-500/30 hover:border-red-500/50"
                )}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {action.icon}
                <span className={cn(
                  "text-sm font-medium",
                  action.highlight && "text-yellow-500 font-bold",
                  action.adminOnly && "text-red-500"
                )}>{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <FloatingActionButton 
        onClick={toggleMenu}
        isOpen={isOpen}
      />

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}