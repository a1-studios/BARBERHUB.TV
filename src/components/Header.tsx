import { useState } from "react";
import { Menu, X, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 rounded-[2rem] bg-card/50 px-6 mx-4 my-2 border border-border/50 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-glow hover:border-primary/50 hover:bg-card/70 cursor-pointer group hover:shadow-[0_0_30px_hsl(24_100%_52%/0.5)]">
            {/* Left Icon */}
            <div className="flex items-center flex-1">
              <img src="/lovable-uploads/c5bbb6c4-149e-41f8-9e68-1580ee1afdf8.png" alt="Barber Hub" className="w-8 h-8 animate-float group-hover:animate-glow" />
            </div>

            {/* Centered BARBER-HUB Text */}
            <div className="flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
              <span className="text-xl font-bold">
                <span className="text-white">BARBER</span>
                <span className="text-primary group-hover:text-primary/90 transition-colors duration-300">-HUB</span>
              </span>
            </div>

            {/* Desktop Navigation - hidden on smaller screens */}
            <nav className="hidden lg:flex items-center space-x-8 flex-1 justify-start ml-8">
              <a href="#competition" className="nav-link">Competition</a>
              <a href="#community" className="nav-link">Community</a>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4 flex-1 justify-end">
              <Button variant="outline" size="sm" className="hidden sm:flex items-center space-x-2 btn-secondary">
                <Instagram className="w-4 h-4" />
                <span>Follow</span>
              </Button>
              
              <Button size="sm" className="btn-primary">
                Sign Up
              </Button>

              {/* Mobile Menu Button */}
              <Button variant="ghost" size="sm" className="md:hidden" onClick={toggleMenu}>
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Quick Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={toggleMenu} />
          <div className="fixed right-0 top-16 bottom-0 w-80 bg-card border-l border-border animate-slide-in-right">
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gradient">Quick Menu</h3>
              
              <nav className="space-y-4">
                <a href="#competition" className="block py-3 px-4 rounded-lg nav-link hover:bg-muted transition-colors">
                  Competition
                </a>
                <a href="#community" className="block py-3 px-4 rounded-lg nav-link hover:bg-muted transition-colors">
                  Community
                </a>
                <a href="#grants" className="block py-3 px-4 rounded-lg nav-link hover:bg-muted transition-colors">
                  Barber Grants
                </a>
                <a href="#dashboard" className="block py-3 px-4 rounded-lg nav-link hover:bg-muted transition-colors">
                  My Dashboard
                </a>
              </nav>

              <div className="space-y-3 pt-6 border-t border-border">
                <Button className="w-full btn-secondary justify-start" onClick={toggleMenu}>
                  <Instagram className="w-4 h-4 mr-2" />
                  Follow Instagram
                </Button>
                <Button variant="outline" className="w-full btn-secondary" onClick={toggleMenu}>
                  Sign In
                </Button>
                <Button className="w-full btn-primary" onClick={toggleMenu}>
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
