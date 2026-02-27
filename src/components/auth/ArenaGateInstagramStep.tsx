import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Instagram, ExternalLink } from 'lucide-react';

interface ArenaGateInstagramStepProps {
  onVerified: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export const ArenaGateInstagramStep = ({
  onVerified,
  onBack,
  isLoading,
}: ArenaGateInstagramStepProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleOpenInstagram = () => {
    window.open('https://instagram.com/barberhub.tv', '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground mb-1">Join the Community!</h3>
        <p className="text-sm text-muted-foreground">Follow us for battle updates & exclusive content</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        {/* Instagram icon with gradient */}
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 3, -3, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.4)]"
        >
          <Instagram className="w-10 h-10 text-white" />
        </motion.div>

        {/* Follow button */}
        <Button
          variant="outline"
          size="lg"
          onClick={handleOpenInstagram}
          className="border-pink-500/50 text-pink-400 hover:bg-pink-500/10 hover:border-pink-500"
        >
          <Instagram className="w-5 h-5 mr-2" />
          Follow @barberhub.tv
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>

        {/* Confirmation checkbox */}
        <div className="flex items-center gap-3 bg-background/50 rounded-lg px-4 py-3 border border-border/50">
          <Checkbox 
            id="instagram-confirm"
            checked={confirmed} 
            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
          />
          <label 
            htmlFor="instagram-confirm"
            className="text-sm cursor-pointer"
          >
            I have followed <span className="text-pink-400 font-medium">@barberhub.tv</span>
          </label>
        </div>

        {/* Benefits */}
        <div className="text-center text-xs text-muted-foreground max-w-xs">
          Get notified about upcoming tournaments, exclusive tips, and connect with the global barber community
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="ghost" onClick={onBack} className="px-6" disabled={isLoading}>
          ← Back
        </Button>
        <Button 
          onClick={onVerified} 
          disabled={!confirmed}
          className="flex-1 bg-gradient-to-r from-primary via-orange-500 to-cyan-500 hover:from-primary/90 hover:via-orange-500/90 hover:to-cyan-500/90 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
        >
          Continue →
        </Button>
      </div>
    </motion.div>
  );
};
