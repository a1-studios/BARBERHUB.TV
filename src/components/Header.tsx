import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Menu, X, Trophy, Plus, User, LogOut, Sparkles, Zap, Scissors, Swords, Crown, CreditCard } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import barberPole from '@/assets/barber-pole.png';
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

const Header = () => {
  const { user, signOut } = useAuth();
  const { isBarber, isFan } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleBrandClick = () => {
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Filter actions based on auth and user type
  const availableActions = quickActions.filter(action => {
    if (action.requiresAuth && !user) return false;
    if (action.barberOnly && !isBarber) return false;
    return true;
  });

  const handleQuickActionClick = (action: QuickAction) => {
    if (action.requiresAuth && !user) {
      navigate('/');
      setQuickActionsOpen(false);
      return;
    }
    
    navigate(action.path);
    setQuickActionsOpen(false);
  };

  // Close quick actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setQuickActionsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQuickActionsOpen(false);
      }
    };

    if (quickActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [quickActionsOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2 border-primary/30 rounded-xl mx-4 mt-2">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo Icon with Quick Actions */}
          <div className="flex items-center relative" ref={quickActionsRef}>
            <button
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className={cn(
                "relative group transition-all duration-300",
                quickActionsOpen && "scale-110"
              )}
              aria-label="Quick Actions"
            >
              <img 
                src={barberPole} 
                alt="Barber Hub Logo" 
                className={cn(
                  "h-12 w-12 transition-all duration-500",
                  "hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]",
                  quickActionsOpen ? "animate-pulse" : "animate-[spin_4s_linear_infinite]"
                )}
              />
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            </button>

            {/* Quick Actions Menu */}
            {quickActionsOpen && user && (
              <div className="absolute top-full left-0 mt-2 z-50">
                <div className="flex flex-col space-y-2 animate-scale-in">
                  {availableActions.map((action, index) => (
                    <Button
                      key={action.id}
                      onClick={() => handleQuickActionClick(action)}
                      variant="default"
                      size="sm"
                      className={cn(
                        "w-48 justify-start gap-3 bg-card/95 backdrop-blur-sm",
                        "border border-border/50 hover:border-primary/50",
                        "shadow-lg hover:shadow-glow",
                        "transition-all duration-300",
                        "animate-fade-in"
                      )}
                      style={{
                        animationDelay: `${index * 0.05}s`
                      }}
                    >
                      {action.icon}
                      <span className="text-sm font-medium">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Centered Brand */}
          <button
            onClick={handleBrandClick}
            className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-xl sm:text-2xl font-bold">
              <span className="text-white">BARBER</span>
              <span className="text-primary">-HUB</span>
            </span>
          </button>

          {/* Right Side - Menu */}
          <div className="flex items-center gap-2">
            {/* Hamburger Menu Button */}
            <button
              className="p-2 -mr-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Hamburger Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-4 right-4 bg-background/95 backdrop-blur border-2 border-primary/30 rounded-xl shadow-lg mt-2">
            <div className="px-4 py-6 space-y-4">
              {user ? (
                <>
                  <Link
                    to="/barbers"
                    className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Scissors className="h-5 w-5" />
                    Barbers
                  </Link>

                  {isBarber && (
                    <>
                      <Link
                        to="/portal"
                        className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                        onClick={closeMobileMenu}
                      >
                        <Zap className="h-5 w-5" />
                        Portal
                      </Link>
                      <Link
                        to="/battles/create"
                        className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                        onClick={closeMobileMenu}
                      >
                        <Plus className="h-5 w-5" />
                        Create Battle
                      </Link>
                    </>
                  )}
                  {isFan && (
                    <Link
                      to="/creator-hub"
                      className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                      onClick={closeMobileMenu}
                    >
                      <Trophy className="h-5 w-5" />
                      Watch Battles
                    </Link>
                  )}
                  <Link
                    to="/haircut-advisor"
                    className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Sparkles className="h-5 w-5" />
                    Haircut Advisor
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </Link>
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 py-2 text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <div className="pt-2">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      closeMobileMenu();
                      navigate('/');
                    }}
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
