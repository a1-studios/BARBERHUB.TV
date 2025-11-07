import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Button } from '@/components/ui/button';
import { 
  Swords, 
  Plus, 
  Scissors, 
  User, 
  Crown, 
  CreditCard,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiresAuth: boolean;
  barberOnly?: boolean;
}

const quickActions: QuickAction[] = [
  {
    id: 'battles',
    label: 'View Battles',
    icon: <Swords className="w-5 h-5" />,
    path: '/battles',
    requiresAuth: true
  },
  {
    id: 'create-battle',
    label: 'Create Battle',
    icon: <Plus className="w-5 h-5" />,
    path: '/battles/create',
    requiresAuth: true,
    barberOnly: true
  },
  {
    id: 'haircut-advisor',
    label: 'Haircut Advisor',
    icon: <Scissors className="w-5 h-5" />,
    path: '/haircut-advisor',
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
    id: 'add-funds',
    label: 'Add Funds',
    icon: <CreditCard className="w-5 h-5" />,
    path: '/portal',
    requiresAuth: true
  }
];

export function QuickActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { isBarber } = useUserRole();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter actions based on auth and user type
  const availableActions = quickActions.filter(action => {
    if (action.requiresAuth && !user) return false;
    if (action.barberOnly && !isBarber) return false;
    return true;
  });

  const handleActionClick = (action: QuickAction) => {
    if (action.requiresAuth && !user) {
      navigate('/');
      setIsOpen(false);
      return;
    }
    
    navigate(action.path);
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
                  "w-40 justify-start gap-3 bg-card/95 backdrop-blur-sm",
                  "border border-border/50 hover:border-primary/50",
                  "shadow-lg hover:shadow-glow",
                  "transition-all duration-300",
                  "animate-slide-in-right"
                )}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {action.icon}
                <span className="text-sm font-medium">{action.label}</span>
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