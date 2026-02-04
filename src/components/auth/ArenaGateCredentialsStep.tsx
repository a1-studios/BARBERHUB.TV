import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface ArenaGateCredentialsStepProps {
  displayName: string;
  email: string;
  password: string;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ArenaGateCredentialsStep = ({
  displayName,
  email,
  password,
  onChange,
  onNext,
  onBack,
}: ArenaGateCredentialsStepProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): boolean => {
    if (!displayName.trim()) {
      toast.error('Please enter your display name');
      return false;
    }
    if (displayName.trim().length < 2) {
      toast.error('Display name must be at least 2 characters');
      return false;
    }
    if (!email.trim()) {
      toast.error('Please enter your email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!password) {
      toast.error('Please enter a password');
      return false;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
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
        <h3 className="text-xl font-bold text-foreground mb-1">Create Your Account</h3>
        <p className="text-sm text-muted-foreground">Enter your credentials to join the arena</p>
      </div>

      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Display Name
          </Label>
          <Input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => onChange('displayName', e.target.value)}
            placeholder="Your barber name"
            className="bg-background/50 border-border/50"
          />
          <p className="text-xs text-muted-foreground">
            This name will be displayed publicly in battles
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="your@email.com"
            className="bg-background/50 border-border/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="Min 6 characters"
              className="bg-background/50 border-border/50 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
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
          Continue
        </Button>
      </div>
    </motion.div>
  );
};
