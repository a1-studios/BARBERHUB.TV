import { Button } from "@/components/ui/button";
import { Scissors, Menu, X, Instagram, User, LogOut } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { FEATURES } from "@/config/features";

const Header = () => {
  console.log('Header component rendering...');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  console.log('About to call useAuth...');
  const { user, signOut, loading } = useAuth();
  console.log('useAuth returned:', { user, loading });

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="relative flex items-center justify-between h-16 px-6 mx-4 my-2 border border-border/50 shadow-lg backdrop-blur-sm bg-card/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(24_100%_52%/0.5),inset_0_0_20px_hsl(24_100%_52%/0.15)] hover:border-primary/30" style={{
            borderRadius: '2.4rem'
          }}>
            {/* Left side - Icon */}
            <div className="flex items-center space-x-2">
              <img src="/lovable-uploads/c5bbb6c4-149e-41f8-9e68-1580ee1afdf8.png" alt="Barber Hub" className="w-8 h-8 animate-float" />
            </div>

            {/* Center - BARBER-HUB (absolutely centered) */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="text-xl font-bold whitespace-nowrap">
                <span className="text-white">BARBER</span>
                <span className="text-primary">-HUB</span>
              </span>
            </div>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#services" className="nav-link">Services</a>
              <a href="#community" className="nav-link">Community</a>
              <a href="#contact" className="nav-link">Contact</a>
              
              {FEATURES.HEADER_INSTAGRAM_FOLLOW && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => window.open('https://instagram.com', '_blank')}
                >
                  <Instagram size={16} />
                  Follow
                </Button>
              )}
              
              {!loading && (
                user ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <AuthDialog>
                    <Button size="sm">
                      <User className="mr-2 h-4 w-4" />
                      Join Hub
                    </Button>
                  </AuthDialog>
                )
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <Button variant="ghost" size="sm" className="md:hidden" onClick={toggleMenu}>
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {FEATURES.HEADER_MOBILE_QUICK_MENU && isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <a href="#services" className="block nav-link">Services</a>
            <a href="#community" className="block nav-link">Community</a>
            <a href="#contact" className="block nav-link">Contact</a>
            
            {FEATURES.HEADER_INSTAGRAM_FOLLOW && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full flex items-center justify-center gap-2"
                onClick={() => window.open('https://instagram.com', '_blank')}
              >
                <Instagram size={16} />
                Follow on Instagram
              </Button>
            )}
            
            {!loading && (
              user ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <AuthDialog>
                  <Button size="sm" className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    Join Hub
                  </Button>
                </AuthDialog>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;