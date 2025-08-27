
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { Scissors, Menu, X, Trophy, Plus, User, LogOut } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const Header = () => {
  const { user, signOut } = useAuth();
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand */}
          <button
            onClick={handleBrandClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Scissors className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold text-gradient">BARBER HUB</span>
          </button>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/battles"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trophy className="h-4 w-4" />
                Battles
              </Link>
              <Link
                to="/battles/create"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Battle
              </Link>
            </nav>
          )}

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Welcome back!
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <AuthDialog>
                <Button size="sm">Sign In</Button>
              </AuthDialog>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 -mr-2"
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur border-b border-border shadow-lg">
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
                  <Link
                    to="/battles/create"
                    className="flex items-center gap-3 py-2 text-foreground hover:text-primary transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Plus className="h-5 w-5" />
                    Create Battle
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
                  <AuthDialog>
                    <Button className="w-full" onClick={closeMobileMenu}>
                      Sign In
                    </Button>
                  </AuthDialog>
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
