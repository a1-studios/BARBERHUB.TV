import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Zap, Trophy, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

export const OnboardingMessage = () => {
  const [dismissed, setDismissed] = useState(false);
  const { isBarber, isFan } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has dismissed the onboarding message
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  if (dismissed) return null;

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <Alert className="relative border-primary/50 bg-gradient-to-r from-primary/10 to-secondary/10">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        
        {isBarber ? (
          <>
            <Zap className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-bold">Welcome, Barber! 💈</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>Get started by visiting the <strong>Battle Portal</strong> to manage your competitions and showcase your skills!</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => { navigate('/portal'); handleDismiss(); }}>
                  <Zap className="w-4 h-4 mr-2" />
                  Go to Portal
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigate('/battles/create'); handleDismiss(); }}>
                  Create Your First Battle
                </Button>
              </div>
            </AlertDescription>
          </>
        ) : (
          <>
            <Trophy className="h-5 w-5 text-primary" />
            <AlertTitle className="text-lg font-bold">Welcome to Barber Hub! 🎉</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>Watch epic barber battles from around the world and vote for your favorites!</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={() => { navigate('/creator-hub'); handleDismiss(); }}>
                  <Trophy className="w-4 h-4 mr-2" />
                  Watch Battles
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigate('/haircut-advisor'); handleDismiss(); }}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try AI Advisor
                </Button>
              </div>
            </AlertDescription>
          </>
        )}
      </Alert>
    </div>
  );
};
