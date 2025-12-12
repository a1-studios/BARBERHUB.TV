import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Scissors, Eye, Vote, Trophy, Play, DollarSign, Users, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "barberhub_welcome_seen";

export const WelcomeModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isBarber, isFan, isLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, [isLoading]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleAction = (path: string) => {
    handleDismiss();
    navigate(path);
  };

  if (isLoading) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Welcome to BarberHub!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isBarber 
              ? "Ready to compete? Here's how to get started as a barber."
              : "Join the community! Here's how to enjoy the action."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <AnimatePresence>
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border border-border/30"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                <span className="ml-auto text-2xl font-bold text-muted-foreground/30">
                  {index + 1}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2">
          {isBarber ? (
            <>
              <Button 
                onClick={() => handleAction("/portal")}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Scissors className="mr-2 h-4 w-4" />
                Go to Battle Portal
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDismiss}
                className="w-full"
              >
                Explore First
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => handleAction("/battles")}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Eye className="mr-2 h-4 w-4" />
                Watch Battles
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleAction("/haircut-advisor")}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Try AI Style Advisor
              </Button>
            </>
          )}
        </div>

        <button 
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground text-center mt-2"
        >
          Don't show this again
        </button>
      </DialogContent>
    </Dialog>
  );
};
