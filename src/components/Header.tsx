
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Scissors, Menu, X, Trophy, Plus, User, LogOut, Sparkles, Home } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import barberPole from '@/assets/barber-pole.png';

const Header = () => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch user profile for navigation permissions
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const isBarber = profile?.user_type === 'barber';

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
  const closeQuickMenu = () => setQuickMenuOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2 border-primary/30 rounded-xl mx-4 mt-2">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Quick Menu Button with Barber Pole */}
          <button
            onClick={() => setQuickMenuOpen(!quickMenuOpen)}
            className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-lg transition-colors"
            aria-label="Quick menu"
          >
            <img 
              src={barberPole} 
              alt="Barber Pole Menu" 
              className="h-8 w-4 object-contain"
            />
          </button>

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

        {/* Quick Menu Dropdown */}
        {quickMenuOpen && (
          <div className="absolute top-full left-4 w-64 bg-background/95 backdrop-blur border-2 border-primary/30 rounded-xl shadow-lg mt-2 z-50">
            <div className="px-4 py-6 space-y-4">
              <div className="text-sm font-semibold text-primary mb-4">Quick Navigation</div>
              <Link
                to="/"
                className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={closeQuickMenu}
              >
                <Home className="h-5 w-5" />
                Home
              </Link>
              <Link
                to="/battles"
                className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={closeQuickMenu}
              >
                <Trophy className="h-5 w-5" />
                Battles
              </Link>
              <Link
                to="/haircut-advisor"
                className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={closeQuickMenu}
              >
                <Sparkles className="h-5 w-5" />
                Haircut Advisor
              </Link>
              <Link
                to="/grants"
                className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                onClick={closeQuickMenu}
              >
                <Scissors className="h-5 w-5" />
                Grants
              </Link>
              {user && (
                <Link
                  to="/profile"
                  className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                  onClick={closeQuickMenu}
                >
                  <User className="h-5 w-5" />
                  Profile
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Hamburger Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-4 right-4 bg-background/95 backdrop-blur border-2 border-primary/30 rounded-xl shadow-lg mt-2">
            <div className="px-4 py-6 space-y-4">
              {user ? (
                <>
                  <Link
                    to="/battles"
                    className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Trophy className="h-5 w-5" />
                    View Battles
                  </Link>
                  {isBarber && (
                    <Link
                      to="/battles/create"
                      className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                      onClick={closeMobileMenu}
                    >
                      <Plus className="h-5 w-5" />
                      Create Battle
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
