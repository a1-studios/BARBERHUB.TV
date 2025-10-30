
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Menu, X, Trophy, Plus, User, LogOut, Sparkles, Zap, Scissors } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import barberPole from '@/assets/barber-pole.png';

const Header = () => {
  const { user, signOut } = useAuth();
  const { isBarber, isFan } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-2 border-primary/30 rounded-xl mx-4 mt-2">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo Icon */}
          <div className="flex items-center">
            <img 
              src={barberPole} 
              alt="Barber Hub Logo" 
              className="h-10 w-10 animate-spin-slow"
            />
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
