import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Coins, Plus, User, LogOut, Sparkles, Zap, Scissors, Swords, Crown, Wallet } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import barberPole from '@/assets/barber-pole.png';
import { cn } from '@/lib/utils';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { AddFundsModal } from './AddFundsModal';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiresAuth: boolean;
  barberOnly?: boolean;
  adminOnly?: boolean;
  onClick?: () => void;
}

const Header = () => {
  const { user, signOut } = useAuth();
  const { isBarber, isAdmin } = useUserRole();
  
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [bbDropdownOpen, setBbDropdownOpen] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const bbDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { barberBucks, purchaseBucks, showAddFundsModal, setShowAddFundsModal } = useBarberBucks();

  const bbPackages = [
    { amount: 25, price: 5, bonus: 0 },
    { amount: 55, price: 10, bonus: 5 },
    { amount: 150, price: 25, bonus: 25 },
    { amount: 300, price: 50, bonus: 50 },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'barbers',
      label: 'Barbers',
      icon: <Scissors className="w-5 h-5" />,
      path: '/barbers',
      requiresAuth: true
    },
    {
      id: 'battles',
      label: 'View Battles',
      icon: <Swords className="w-5 h-5" />,
      path: '/battles',
      requiresAuth: true
    },
    {
      id: 'portal',
      label: 'Portal',
      icon: <Zap className="w-5 h-5" />,
      path: '/portal',
      requiresAuth: true,
      barberOnly: true
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
      id: 'creator-hub',
      label: 'Creator Hub',
      icon: <Crown className="w-5 h-5" />,
      path: '/creator-hub',
      requiresAuth: true,
      barberOnly: true
    },
    {
      id: 'ai-style',
      label: 'AI Style',
      icon: <Sparkles className="w-5 h-5" />,
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
      id: 'admin-dashboard',
      label: 'Admin Dashboard',
      icon: <Zap className="w-5 h-5 text-destructive" />,
      path: '/admin',
      requiresAuth: true,
      adminOnly: true
    },
    {
      id: 'sign-out',
      label: 'Sign Out',
      icon: <LogOut className="w-5 h-5 text-muted-foreground" />,
      path: '/',
      requiresAuth: true,
      onClick: () => handleSignOut()
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleBrandClick = () => {
    navigate('/');
  };

  // Filter actions based on auth and user type
  const availableActions = quickActions.filter(action => {
    if (action.requiresAuth && !user) return false;
    if (action.barberOnly && !isBarber) return false;
    if (action.adminOnly && !isAdmin) return false;
    return true;
  });

  const handleQuickActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
      setQuickActionsOpen(false);
      return;
    }
    
    if (action.requiresAuth && !user) {
      navigate('/');
      setQuickActionsOpen(false);
      return;
    }
    
    navigate(action.path);
    setQuickActionsOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setQuickActionsOpen(false);
      }
      if (bbDropdownRef.current && !bbDropdownRef.current.contains(event.target as Node)) {
        setBbDropdownOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQuickActionsOpen(false);
        setBbDropdownOpen(false);
      }
    };

    if (quickActionsOpen || bbDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [quickActionsOpen, bbDropdownOpen]);

  const handlePurchase = (price: number) => {
    setBbDropdownOpen(false);
    purchaseBucks.mutate(price);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2 border-primary/40 rounded-xl mx-4 mt-2">
      {/* Energy pulse effects - pointer-events-none ensures clicks pass through */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-0">
        <div className="absolute w-32 h-32 bg-cyan/20 rounded-full blur-2xl animate-[energy-pulse-1_8s_ease-in-out_infinite]" />
        <div className="absolute w-24 h-24 bg-cyan/15 rounded-full blur-xl animate-[energy-pulse-2_10s_ease-in-out_infinite_3s]" />
        <div className="absolute w-20 h-20 bg-cyan/10 rounded-full blur-lg animate-[energy-pulse-3_12s_ease-in-out_infinite_6s]" />
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
                  quickActionsOpen ? "animate-pulse" : "animate-[spin_11s_linear_infinite]"
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
                        "animate-fade-in",
                        action.adminOnly && "border-red-500/30 hover:border-red-500/50"
                      )}
                      style={{
                        animationDelay: `${index * 0.05}s`
                      }}
                    >
                      {action.icon}
                      <span className={cn(
                        "text-sm font-medium",
                        action.adminOnly && "text-red-500"
                      )}>{action.label}</span>
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

          {/* Right Side - Barber Bucks Balance with Dropdown */}
          <div className="relative" ref={bbDropdownRef}>
            <button
              onClick={() => setBbDropdownOpen(!bbDropdownOpen)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200",
                "bg-cyan/10 hover:bg-cyan/20 border border-cyan/30",
                bbDropdownOpen && "bg-cyan/20 border-cyan/50"
              )}
              aria-label="Barber Bucks balance"
            >
              <Coins className="h-4 w-4 text-cyan" />
              <span className="text-sm font-bold text-cyan tabular-nums">
                {barberBucks.toLocaleString()}
              </span>
            </button>

            {/* BB Dropdown Panel */}
            {bbDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-72 animate-scale-in">
                <div className="bg-card/95 backdrop-blur-md border-2 border-cyan/30 rounded-xl shadow-lg overflow-hidden">
                  {/* Header with Balance */}
                  <div className="bg-gradient-to-r from-cyan/20 to-primary/20 px-4 py-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-cyan" />
                        <span className="text-sm font-medium text-muted-foreground">Your Balance</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="h-5 w-5 text-primary" />
                        <span className="text-xl font-bold text-primary tabular-nums">
                          {barberBucks.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Purchase Grid */}
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground mb-2 px-1">Quick Add</p>
                    <div className="grid grid-cols-2 gap-2">
                      {bbPackages.map((pkg) => (
                        <button
                          key={pkg.price}
                          onClick={() => handlePurchase(pkg.price)}
                          className={cn(
                            "flex flex-col items-center p-3 rounded-lg transition-all duration-200",
                            "bg-background/50 hover:bg-primary/10 border border-border/50 hover:border-primary/50",
                            "group"
                          )}
                        >
                          <div className="flex items-center gap-1 text-primary font-bold">
                            <Coins className="h-4 w-4" />
                            <span>{pkg.amount}</span>
                          </div>
                          {pkg.bonus > 0 && (
                            <span className="text-[10px] text-cyan font-medium">+{pkg.bonus} bonus!</span>
                          )}
                          <span className="text-xs text-muted-foreground mt-1">${pkg.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* View All Button */}
                  <div className="px-3 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-cyan/30 hover:border-cyan/50 hover:bg-cyan/10 text-cyan"
                      onClick={() => {
                        setBbDropdownOpen(false);
                        setShowAddFundsModal(true);
                      }}
                    >
                      View All Packages
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Funds Modal */}
      <AddFundsModal 
        isOpen={showAddFundsModal} 
        onClose={() => setShowAddFundsModal(false)} 
      />
    </header>
  );
};

export default Header;