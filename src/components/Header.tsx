import { Button } from "@/components/ui/button";
import { Scissors, Menu, X, Instagram, User, LogOut } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { FEATURES } from "@/config/features";
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  return <>
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
              <Link to="/" className="text-xl font-bold whitespace-nowrap hover:opacity-80 transition-opacity">
                <span className="text-white">BARBER</span>
                <span className="text-primary">-HUB</span>
              </Link>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Menu Button - Always visible */}
              <Button variant="ghost" size="sm" onClick={toggleMenu}>
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger menu - Always visible when open */}
      {isMenuOpen && <div className="fixed top-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-40">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {/* Category Sections */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-primary">Categories</h3>
              <a href="#barbers" className="block nav-link">Barbers</a>
              <a href="#creators" className="block nav-link">Creators</a>
              <a href="#fans" className="block nav-link">Fans</a>
              <a href="#clients" className="block nav-link">Clients</a>
            </div>
            
            {/* Separator */}
            <div className="border-t border-border"></div>
            
            {/* Main Navigation */}
            <div className="space-y-3">
              <a href="#battles" className="block nav-link text-orange-500">Battles</a>
              <a href="#services" className="block nav-link">Services</a>
              <a href="#community" className="block nav-link">Community</a>
              <a href="#contact" className="block nav-link">Contact</a>
            </div>
            
            {FEATURES.HEADER_INSTAGRAM_FOLLOW && <>
                <div className="border-t border-border"></div>
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2" onClick={() => window.open('https://instagram.com', '_blank')}>
                  <Instagram size={16} />
                  Follow on Instagram
                </Button>
              </>}
            
            {!loading && <>
                <div className="border-t border-border"></div>
                {user ? <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button> : <AuthDialog>
                    <Button size="sm" className="w-full">
                      <User className="mr-2 h-4 w-4" />
                      Join Hub
                    </Button>
                  </AuthDialog>}
              </>}
          </div>
        </div>}
    </>;
};
export default Header;