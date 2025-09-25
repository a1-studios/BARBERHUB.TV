import { Instagram, Twitter, Facebook, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card/30 backdrop-blur-sm border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
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
            <p className="text-muted-foreground">
              The ultimate platform for barber competitions, community, and grants.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Competition */}
          <div>
            <h3 className="font-semibold mb-4">Competition</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Current Battles</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Voting Rules</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Prize Pool</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Past Winners</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Leaderboard</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Barber Profiles</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Community Guidelines</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Barber Grants</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Business Tools</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Training Resources</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 mt-12 text-center text-muted-foreground">
          <p>&copy; 2024 BARBER-HUB. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;