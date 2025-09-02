
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Vote, 
  Heart, 
  Scissors, 
  MapPin, 
  User,
  LogOut,
  Plus
} from 'lucide-react';

export const RoleBasedNavigation = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Fetch user profile to determine role
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  if (!user || !profile) {
    return null;
  }

  const isBarber = profile.user_type === 'barber';
  const isFan = profile.user_type === 'fan';

  const navItems = [
    // Common items
    {
      path: '/battles',
      label: 'Battles',
      icon: Trophy,
      show: true
    },
    // Fan-only items
    {
      path: '/find-barbers',
      label: 'Find Barbers',
      icon: MapPin,
      show: isFan
    },
    {
      path: '/haircut-advisor',
      label: 'Haircut Advisor',
      icon: Scissors,
      show: isFan
    },
    // Barber-only items
    {
      path: '/battles/create',
      label: 'Create Battle',
      icon: Plus,
      show: isBarber
    }
  ];

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link to="/battles" className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">BarberBattles</span>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems
              .filter(item => item.show)
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    asChild
                  >
                    <Link to={item.path} className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">
                {profile.display_name || 'User'}
              </span>
              <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                {isBarber ? 'Barber' : 'Fan'}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
