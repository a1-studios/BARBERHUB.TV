import { Instagram, Twitter, Facebook, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { openCookiePreferences } from "@/lib/consent";

const Footer = () => {
  return (
    <footer className="bg-card/30 backdrop-blur-sm border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4 col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2">
              <img
                src="/lovable-uploads/c5bbb6c4-149e-41f8-9e68-1580ee1afdf8.png"
                alt="Barber Hub"
                className="w-8 h-8"
              />
              <span className="text-xl font-bold">
                <span className="text-white">BARBER</span>
                <span className="text-gradient">-HUB</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              The ultimate platform for barber competitions, community, and grants.
            </p>
            <div className="flex space-x-4">
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors"><Youtube className="w-5 h-5" /></a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/rankings" className="hover:text-primary transition-colors">Leaderboard</Link></li>
              <li><Link to="/barbers" className="hover:text-primary transition-colors">Barber Profiles</Link></li>
              <li><Link to="/aup" className="hover:text-primary transition-colors">Community Guidelines</Link></li>
              <li><a href="mailto:support@barberhub.tv" className="hover:text-primary transition-colors">Support</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/grants" className="hover:text-primary transition-colors">Barber Grants</Link></li>
              <li><Link to="/tournaments" className="hover:text-primary transition-colors">Tournaments</Link></li>
              <li><Link to="/watch" className="hover:text-primary transition-colors">Watch</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-cyan-300 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-cyan-300 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/aup" className="hover:text-cyan-300 transition-colors">Acceptable Use</Link></li>
              <li><Link to="/cookies" className="hover:text-cyan-300 transition-colors">Cookie Policy</Link></li>
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="hover:text-cyan-300 transition-colors text-left"
                >
                  Cookie Preferences
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 mt-12 text-center text-muted-foreground text-sm">
          <p>&copy; 2026 BARBER-HUB. Operated by Barber Hub LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
