import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";
import { Scissors, Eye, Vote, Trophy, Play, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "barberhub_welcome_seen";

const getCountryFlag = (code: string) => {
  const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

interface WelcomeModalProps {
  mode?: 'first-time' | 'returning';
}

export const WelcomeModal = ({ mode = 'first-time' }: WelcomeModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isBarber, isLoading } = useUserRole();
  const { profile } = useUserProfile();
  const navigate = useNavigate();

  const displayName = profile?.display_name || 'Champion';
  const countryCode = profile?.country_code;

  useEffect(() => {
    if (isLoading) return;
    if (mode === 'returning') return; // returning is handled via toast in Index
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, [isLoading, mode]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleAction = (path: string) => {
    handleDismiss();
    navigate(path);
  };

  if (isLoading || mode === 'returning') return null;

  const barberSteps = [
    { icon: Scissors, title: "Enter Battles", description: "Register for tournament categories and get matched with opponents" },
    { icon: Play, title: "Go Live", description: "Stream your 1-hour haircut battle from your shop" },
    { icon: Trophy, title: "Win & Earn", description: "Collect points, climb rankings, and earn Barber Bucks" },
  ];

  const fanSteps = [
    { icon: Eye, title: "Watch Battles", description: "View live 50/50 split-screen barber competitions" },
    { icon: Vote, title: "Vote & React", description: "Cast votes, send reactions, and chat with the community" },
    { icon: DollarSign, title: "Support Creators", description: "Donate Barber Bucks to your favorite barbers" },
  ];

  const steps = isBarber ? barberSteps : fanSteps;

  const subtitle = isBarber
    ? "Time to show the world what you've got. 💈"
    : "The front row awaits. Let's go! 🎬";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-sm bg-card border-border/50 ring-2 ring-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.25)] p-4 sm:p-5">
        <DialogHeader className="text-center space-y-1">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 ring-1 ring-cyan-400/50 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            <span>Welcome, </span>
            <span className="text-primary">{displayName}</span>
            <span>! 🔥</span>
            {countryCode && (
              <span className="ml-1.5 text-xl">{getCountryFlag(countryCode)}</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <AnimatePresence>
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.12 }}
                className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 border border-border/30"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm leading-tight">{step.title}</h4>
                  <p className="text-xs text-muted-foreground leading-snug">{step.description}</p>
                </div>
                <span className="ml-auto text-lg font-semibold text-muted-foreground/30 leading-none">
                  {index + 1}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2">
          {isBarber ? (
            <>
              <Button size="sm" onClick={() => handleAction("/portal")} className="w-full bg-primary hover:bg-primary/90">
                <Scissors className="mr-2 h-3.5 w-3.5" />
                Go to Battle Portal
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss} className="w-full">
                Explore First
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => handleAction("/battles")} className="w-full bg-primary hover:bg-primary/90">
                <Eye className="mr-2 h-3.5 w-3.5" />
                Watch Battles
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismiss} className="w-full">
                Explore First
              </Button>
            </>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="text-[10px] text-muted-foreground hover:text-foreground text-center mt-1"
        >
          Don't show this again
        </button>
      </DialogContent>
    </Dialog>
  );
};
