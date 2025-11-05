import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Instagram, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface InstagramFollowVerificationProps {
  onVerified: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

const InstagramFollowVerification = ({ onVerified, onBack, isLoading }: InstagramFollowVerificationProps) => {
  const [hasFollowed, setHasFollowed] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Load Instagram embed script
    const script = document.createElement('script');
    script.src = '//www.instagram.com/embed.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
      // Process Instagram embeds
      if (window.instgrm) {
        window.instgrm.Embeds.process();
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleContinue = () => {
    if (!hasFollowed) {
      toast.error('Please confirm you have followed @barberhub.ig to continue');
      return;
    }
    onVerified();
  };

  const openInstagram = () => {
    window.open('https://www.instagram.com/barberhub.ig/', '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Instagram className="h-8 w-8 text-pink-500" />
          <CardTitle className="text-2xl text-white">One Last Step!</CardTitle>
        </div>
        <CardDescription>
          Follow us on Instagram to join the Barber Hub community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instagram Embed */}
        <div className="flex justify-center">
          <blockquote 
            className="instagram-media" 
            data-instgrm-permalink="https://www.instagram.com/barberhub.ig/?utm_source=ig_embed&utm_campaign=loading" 
            data-instgrm-version="14" 
            style={{ 
              background: '#FFF', 
              border: 0, 
              borderRadius: '3px', 
              boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)', 
              margin: '1px', 
              maxWidth: '540px', 
              minWidth: '326px', 
              padding: 0, 
              width: '99.375%'
            }}
          >
            <div style={{ padding: '16px' }}>
              <a 
                href="https://www.instagram.com/barberhub.ig/?utm_source=ig_embed&utm_campaign=loading" 
                style={{ 
                  background: '#FFFFFF', 
                  lineHeight: 0, 
                  padding: '0 0', 
                  textAlign: 'center', 
                  textDecoration: 'none', 
                  width: '100%' 
                }} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <div style={{ backgroundColor: '#F4F4F4', borderRadius: '50%', flexGrow: 0, height: '40px', marginRight: '14px', width: '40px' }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
                    <div style={{ backgroundColor: '#F4F4F4', borderRadius: '4px', flexGrow: 0, height: '14px', marginBottom: '6px', width: '100px' }}></div>
                    <div style={{ backgroundColor: '#F4F4F4', borderRadius: '4px', flexGrow: 0, height: '14px', width: '60px' }}></div>
                  </div>
                </div>
              </a>
            </div>
          </blockquote>
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-4">
          <Button
            onClick={openInstagram}
            variant="outline"
            className="w-full max-w-sm gap-2"
            type="button"
          >
            <Instagram className="h-4 w-4" />
            Follow @barberhub.ig
            <ExternalLink className="h-3 w-3" />
          </Button>

          {/* Confirmation Checkbox */}
          <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="instagram-follow"
              checked={hasFollowed}
              onCheckedChange={(checked) => setHasFollowed(checked === true)}
              disabled={isLoading}
            />
            <label
              htmlFor="instagram-follow"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I have followed @barberhub.ig on Instagram
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1"
            >
              ← Back
            </Button>
          )}
          <Button
            onClick={handleContinue}
            disabled={!hasFollowed || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Completing signup...' : 'Complete Signup'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By continuing, you agree to follow our community guidelines and stay updated with the latest barber battles and events.
        </p>
      </CardContent>
    </Card>
  );
};

// Extend Window interface for Instagram embed
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

export default InstagramFollowVerification;
