import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlagCarousel, getCountryFlag, CAROUSEL_COUNTRIES } from './FlagCarousel';
import { ClipperSwipeVerifier } from './ClipperSwipeVerifier';
import { FreshAnimation } from './FreshAnimation';
import { ArenaGateProgressIndicator } from './ArenaGateProgressIndicator';
import { ArenaGateCredentialsStep } from './ArenaGateCredentialsStep';
import { ArenaGateBarberInfoStep } from './ArenaGateBarberInfoStep';
import { ArenaGateInstagramStep } from './ArenaGateInstagramStep';
import { ArenaGateChooseTierStep } from './ArenaGateChooseTierStep';
import { ArenaGateChooseCategoriesStep } from './ArenaGateChooseCategoriesStep';
import { SwipeMetrics, useGestureVerification } from '@/hooks/useGestureVerification';
import { HapticFeedback } from '@/utils/hapticFeedback';
import { getCountryCulturalData, triggerCountryCelebration } from '@/utils/countryCelebration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

type Step = 'select' | 'verify' | 'credentials' | 'barber-info' | 'instagram' | 'success' | 'choose-tier' | 'choose-categories';

interface FormData {
  displayName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export const ArenaGateModal = ({ isOpen, onClose, onComplete }: ArenaGateModalProps) => {
  const [step, setStep] = useState<Step>('select');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string>('');
  
  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    email: '',
    password: '',
    phoneNumber: '',
  });
  
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
    setVerificationToken(token);
    setStep('credentials');
    HapticFeedback.follow();
  }, [selectedCountry, generateVerificationToken]);

  const handleSwipeFailed = (reason: string) => {
    console.log('Swipe failed:', reason);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAccountCreation = async () => {
    if (!selectedCountry) return;
    
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: formData.displayName,
            user_type: 'barber',
            country_code: selectedCountry,
            phone_number: formData.phoneNumber,
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        // SUCCESS! Show celebration
        setStep('success');
        setShowCelebration(true);
        
        // Fire MASSIVE country celebration - the real reward!
        triggerCountryCelebration(selectedCountry);
      }
      
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleCelebrationComplete = useCallback(() => {
    // Transition to upsell steps instead of closing
    setStep('choose-tier');
    setShowCelebration(false);
  }, []);

  const handleBack = () => {
    const stepOrder: Step[] = ['select', 'verify', 'credentials', 'barber-info', 'instagram', 'success', 'choose-tier', 'choose-categories'];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleFlowComplete = useCallback(() => {
    toast.success('Welcome to the Arena! Check your email to confirm your account.');
    onComplete({
      selectedCountry: selectedCountry || '',
      verificationToken,
      verified: true,
    });
  }, [selectedCountry, verificationToken, onComplete]);

  if (!isOpen) return null;

  // Get cultural data for display
  const culturalData = selectedCountry ? getCountryCulturalData(selectedCountry) : null;
  const countryName = selectedCountry 
    ? CAROUSEL_COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry 
    : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl"
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
          <div className="relative z-10 p-6 flex flex-col" style={{ height: '650px', maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
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

            {/* Progress Indicator */}
            <ArenaGateProgressIndicator currentStep={step} />

            {/* Title */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black bg-gradient-to-r from-primary via-orange-400 to-cyan-400 bg-clip-text text-transparent mb-1">
                WORLD CUP OF BARBERING
              </h2>
              <p className="text-muted-foreground text-sm">
                {step === 'select' && 'Select your nation to represent'}
                {step === 'verify' && 'Confirm with the signature swipe'}
                {step === 'credentials' && 'Create your battle account'}
                {step === 'barber-info' && 'Add your contact info'}
                {step === 'instagram' && 'Join our community'}
                {step === 'success' && 'Welcome to the Arena!'}
                {step === 'choose-tier' && 'Power up your profile'}
                {step === 'choose-categories' && 'Pick your battle categories'}
              </p>
            </div>

            {/* Steps */}
            <div className="flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="flex-1 min-h-0">
                      <FlagCarousel
                        selectedCountry={selectedCountry}
                        onSelect={handleCountrySelect}
                      />
                    </div>

                    {/* Selected country display with cultural data */}
                    {selectedCountry && culturalData && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-4 mt-2"
                      >
                        <div 
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
                          style={{
                            backgroundColor: `${culturalData.colors[0]}20`,
                            borderColor: `${culturalData.colors[0]}50`,
                          }}
                        >
                          <span className="text-xl">{getCountryFlag(selectedCountry)}</span>
                          <span 
                            className="font-bold"
                            style={{ color: culturalData.colors[0] }}
                          >
                            Representing {countryName}
                          </span>
                          <span className="text-xl">{culturalData.celebrationEmoji}</span>
                        </div>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="text-sm mt-2 font-semibold"
                          style={{ color: culturalData.colors[0] }}
                        >
                          "{culturalData.hypePhrase}"
                        </motion.p>
                      </motion.div>
                    )}

                    <Button
                      onClick={handleProceedToVerify}
                      disabled={!selectedCountry}
                      size="lg"
                      className="w-full mt-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
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

                {step === 'credentials' && (
                  <ArenaGateCredentialsStep
                    displayName={formData.displayName}
                    email={formData.email}
                    password={formData.password}
                    onChange={handleFormChange}
                    onNext={() => setStep('barber-info')}
                    onBack={() => setStep('verify')}
                  />
                )}

                {step === 'barber-info' && (
                  <ArenaGateBarberInfoStep
                    phoneNumber={formData.phoneNumber}
                    countryCode={selectedCountry || 'US'}
                    onChange={handleFormChange}
                    onNext={() => setStep('instagram')}
                    onBack={() => setStep('credentials')}
                  />
                )}

                {step === 'instagram' && (
                  <ArenaGateInstagramStep
                    onVerified={handleAccountCreation}
                    onBack={() => setStep('barber-info')}
                    isLoading={loading}
                  />
                )}

                {step === 'choose-tier' && (
                  <ArenaGateChooseTierStep
                    onNext={() => setStep('choose-categories')}
                    onBack={() => {}}
                  />
                )}

                {step === 'choose-categories' && (
                  <ArenaGateChooseCategoriesStep
                    onComplete={handleFlowComplete}
                    onBack={() => setStep('choose-tier')}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Celebration overlay */}
          <FreshAnimation
            show={showCelebration}
            countryCode={selectedCountry || 'US'}
            onComplete={handleCelebrationComplete}
            isFinalCelebration={true}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
