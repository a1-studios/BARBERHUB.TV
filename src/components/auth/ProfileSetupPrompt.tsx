import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Scissors, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProfileSetupPromptProps {
  type: 'barber' | 'fan';
}

export const ProfileSetupPrompt = ({ type }: ProfileSetupPromptProps) => {
  const navigate = useNavigate();

  const handleSetupProfile = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {type === 'barber' ? (
              <Scissors className="h-8 w-8 text-primary" />
            ) : (
              <User className="h-8 w-8 text-primary" />
            )}
            <CardTitle className="text-2xl">Profile Setup Required</CardTitle>
          </div>
          <CardDescription>
            Complete your {type} profile to access all features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              Your {type} profile needs to be completed before you can access this feature.
              This only takes a moment!
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">What you'll need to provide:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {type === 'barber' ? (
                <>
                  <li>Your professional name</li>
                  <li>Location and specialties</li>
                  <li>Years of experience</li>
                  <li>Portfolio (optional)</li>
                </>
              ) : (
                <>
                  <li>Your display name</li>
                  <li>Profile picture (optional)</li>
                  <li>Your preferences</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Back to Home
            </Button>
            <Button
              onClick={handleSetupProfile}
              className="flex-1"
            >
              Setup Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
