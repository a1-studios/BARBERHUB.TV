import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlagCarousel } from './FlagCarousel';
import { ClipperSwipeVerifier } from './ClipperSwipeVerifier';
import { FreshAnimation } from './FreshAnimation';
import { SwipeMetrics, useGestureVerification } from '@/hooks/useGestureVerification';
import { HapticFeedback } from '@/utils/hapticFeedback';

export interface ArenaGateResult {
  selectedCountry: string;
  verificationToken: string;
  verified: boolean;
}

interface ArenaGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: ArenaGateResult) => void;
}

type Step = 'select' | 'verify' | 'success';

export const ArenaGateModal = ({ isOpen, onClose, onComplete }: ArenaGateModalProps) => {
  const [step, setStep] = useState<Step>('select');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const { generateVerificationToken } = useGestureVerification();

  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    HapticFeedback.vote();
  };

  const handleProceedToVerify = () => {
    if (selectedCountry) {
      setStep('verify');
      HapticFeedback.follow();
    }
  };

  const handleVerified = useCallback((metrics: SwipeMetrics) => {
    if (!selectedCountry) return;
    
    const token = generateVerificationToken(selectedCountry, metrics);
    setStep('success');
    setShowCelebration(true);
  }, [selectedCountry, generateVerificationToken]);

  const handleSwipeFailed = (reason: string) => {
    console.log('Swipe failed:', reason);
    // Hint is shown by the verifier component
  };

  const handleCelebrationComplete = useCallback(() => {
    if (!selectedCountry) return;
    
    const token = btoa(JSON.stringify({
      country: selectedCountry,
      timestamp: Date.now(),
      verified: true,
    }));
    
    onComplete({
      selectedCountry,
      verificationToken: token,
      verified: true,
    });
  }, [selectedCountry, onComplete]);

  const handleBack = () => {
    setStep('select');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="absolute inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:w-full overflow-hidden rounded-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f17 50%, #000 100%)',
          }}
        >
          {/* Stadium light beams */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 left-1/4 w-32 h-96 bg-gradient-to-b from-primary/10 to-transparent rotate-12 blur-xl" />
            <div className="absolute -top-20 right-1/4 w-32 h-96 bg-gradient-to-b from-cyan-500/10 to-transparent -rotate-12 blur-xl" />
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg text-foreground">ARENA GATE</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black bg-gradient-to-r from-primary via-orange-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                WORLD CUP OF BARBERING
              </h2>
              <p className="text-muted-foreground text-sm">
                {step === 'select' ? 'Select your nation to represent' : 'Confirm with the signature swipe'}
              </p>
            </div>

            {/* Steps */}
            <div className="flex-1 flex flex-col">
              <AnimatePresence mode="wait">
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex flex-col"
                  >
                    <FlagCarousel
                      selectedCountry={selectedCountry}
                      onSelect={handleCountrySelect}
                    />

                    {/* Selected country display */}
                    {selectedCountry && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-4"
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
                          <Globe className="w-4 h-4 text-primary" />
                          <span className="text-primary font-semibold">
                            Representing {selectedCountry}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    <Button
                      onClick={handleProceedToVerify}
                      disabled={!selectedCountry}
                      size="lg"
                      className="w-full mt-auto bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                    >
                      Continue to Verification
                    </Button>
                  </motion.div>
                )}

                {step === 'verify' && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col"
                  >
                    <ClipperSwipeVerifier
                      onVerified={handleVerified}
                      onFailed={handleSwipeFailed}
                    />

                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="mt-6"
                    >
                      ← Change Country
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Celebration overlay */}
          <FreshAnimation
            show={showCelebration}
            countryCode={selectedCountry || 'US'}
            onComplete={handleCelebrationComplete}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
