import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Phone, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface ArenaGateBarberInfoStepProps {
  phoneNumber: string;
  countryCode: string;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ArenaGateBarberInfoStep = ({
  phoneNumber,
  countryCode,
  onChange,
  onNext,
  onBack,
}: ArenaGateBarberInfoStepProps) => {

  const validate = (): boolean => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }
    // Basic phone validation - at least 7 digits
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      toast.error('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground mb-1">Battle Contact Info</h3>
        <p className="text-sm text-muted-foreground">Required for tournament coordination</p>
      </div>

      <div className="space-y-4 flex-1">
        {/* Privacy notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-500 font-medium">📱 Required for Battles</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your phone is used for battle coordination only - never shared publicly or with third parties.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Phone Number
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => onChange('phoneNumber', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="bg-background/50 border-border/50"
          />
          <p className="text-xs text-muted-foreground">
            Include country code for international competitions
          </p>
        </div>

        {/* Benefits callout */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-4">
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-medium">Why we need this:</span> Tournament organizers may need to reach you for scheduling, last-minute changes, or technical issues during live battles.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <Button variant="ghost" onClick={onBack} className="px-6">
          ← Back
        </Button>
        <Button 
          onClick={handleNext} 
          className="flex-1 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
        >
          Almost There! 🔥
        </Button>
      </div>
    </motion.div>
  );
};
