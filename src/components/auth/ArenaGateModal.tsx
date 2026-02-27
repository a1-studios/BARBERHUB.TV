import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CAROUSEL_COUNTRIES, getCountryFlag } from './FlagCarousel';
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

type Step = 'verify' | 'credentials' | 'barber-info' | 'instagram' | 'claim-flag' | 'success' | 'choose-tier' | 'choose-categories';

interface FormData {
  displayName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export const ArenaGateModal = ({ isOpen, onClose, onComplete }: ArenaGateModalProps) => {
  const [step, setStep] = useState<Step>('verify');
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

  const handleVerified = useCallback((metrics: SwipeMetrics) => {
    const token = generateVerificationToken('pending', metrics);
    setVerificationToken(token);
    setStep('credentials');
    HapticFeedback.follow();
  }, [generateVerificationToken]);

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
        setStep('success');
        setShowCelebration(true);
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
    setStep('choose-tier');
    setShowCelebration(false);
  }, []);

  const handleBack = () => {
    const stepOrder: Step[] = ['verify', 'credentials', 'barber-info', 'instagram', 'claim-flag', 'success', 'choose-tier', 'choose-categories'];
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

  const culturalData = selectedCountry ? getCountryCulturalData(selectedCountry) : null;
  const countryName = selectedCountry 
    ? CAROUSEL_COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry 
    : '';

  const stepSubtitles: Record<Step, string> = {
    'verify': 'Confirm with the signature swipe',
    'credentials': 'Create your battle account',
    'barber-info': 'Add your contact info',
    'instagram': 'Join our community',
    'claim-flag': 'Represent your nation!',
    'success': 'Welcome to the Arena!',
    'choose-tier': 'Power up your profile',
    'choose-categories': 'Pick your battle categories',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f17 50%, #000 100%)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 left-1/4 w-32 h-96 bg-gradient-to-b from-primary/10 to-transparent rotate-12 blur-xl" />
            <div className="absolute -top-20 right-1/4 w-32 h-96 bg-gradient-to-b from-cyan-500/10 to-transparent -rotate-12 blur-xl" />
          </div>

          <div className="relative z-10 p-6 flex flex-col" style={{ height: '650px', maxHeight: '85vh' }}>
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

            <ArenaGateProgressIndicator currentStep={step} />

            <div className="text-center mb-4">
              <h2 className="text-2xl font-black bg-gradient-to-r from-primary via-orange-400 to-cyan-400 bg-clip-text text-transparent mb-1">
                WORLD CUP OF BARBERING
              </h2>
              <p className="text-muted-foreground text-sm">
                {stepSubtitles[step]}
              </p>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
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
                    countryCode="US"
                    onChange={handleFormChange}
                    onNext={() => setStep('instagram')}
                    onBack={() => setStep('credentials')}
                  />
                )}

                {step === 'instagram' && (
                  <ArenaGateInstagramStep
                    onVerified={() => setStep('claim-flag')}
                    onBack={() => setStep('barber-info')}
                    isLoading={false}
                  />
                )}

                {step === 'claim-flag' && (
                  <motion.div
                    key="claim-flag"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col"
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-foreground mb-1">🏆 Claim Your Flag</h3>
                      <p className="text-sm text-muted-foreground">Choose the nation you'll represent in battle</p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                      {/* Country selector */}
                      <div className="w-full max-w-xs">
                        <Select value={selectedCountry || ''} onValueChange={(val) => setSelectedCountry(val)}>
                          <SelectTrigger className="bg-background/50 border-border/50 h-12 text-base">
                            <SelectValue placeholder="🌍 Select your country" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {CAROUSEL_COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {getCountryFlag(country.code)} {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Animated flag display */}
                      {selectedCountry && culturalData && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          className="flex flex-col items-center gap-3"
                        >
                          <span className="text-7xl">{getCountryFlag(selectedCountry)}</span>
                          <div 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
                            style={{
                              backgroundColor: `${culturalData.colors[0]}20`,
                              borderColor: `${culturalData.colors[0]}50`,
                            }}
                          >
                            <span className="font-bold" style={{ color: culturalData.colors[0] }}>
                              Representing {countryName}
                            </span>
                            <span className="text-xl">{culturalData.celebrationEmoji}</span>
                          </div>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-sm font-semibold"
                            style={{ color: culturalData.colors[0] }}
                          >
                            "{culturalData.hypePhrase}"
                          </motion.p>
                        </motion.div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="ghost" onClick={() => setStep('instagram')} className="px-6" disabled={loading}>
                        ← Back
                      </Button>
                      <Button
                        onClick={handleAccountCreation}
                        disabled={!selectedCountry || loading}
                        className="flex-1 bg-gradient-to-r from-primary via-orange-500 to-cyan-500 hover:from-primary/90 hover:via-orange-500/90 hover:to-cyan-500/90 shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            <Trophy className="w-4 h-4 mr-2" />
                            CLAIM MY FLAG & CREATE ACCOUNT 🏆
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
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
