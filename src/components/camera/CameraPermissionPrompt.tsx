import { Camera, Settings, RefreshCw, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface CameraPermissionPromptProps {
  status: PermissionStatus;
  onRequestPermission: () => void;
  onUploadInstead: () => void;
}

const getBrowserInstructions = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return {
      browser: 'Chrome',
      steps: [
        'Click the camera icon in the address bar (right side)',
        'Select "Always allow" for camera access',
        'Click "Done" and refresh the page'
      ],
      settingsPath: 'chrome://settings/content/camera'
    };
  } else if (userAgent.includes('firefox')) {
    return {
      browser: 'Firefox',
      steps: [
        'Click the shield/lock icon in the address bar',
        'Click "Connection secure" → "More Information"',
        'Go to "Permissions" tab and allow Camera',
        'Refresh the page'
      ],
      settingsPath: 'about:preferences#privacy'
    };
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return {
      browser: 'Safari',
      steps: [
        'Go to Safari → Settings → Websites',
        'Click "Camera" in the left sidebar',
        'Find this website and select "Allow"',
        'Refresh the page'
      ],
      settingsPath: null
    };
  } else if (userAgent.includes('edg')) {
    return {
      browser: 'Edge',
      steps: [
        'Click the lock icon in the address bar',
        'Click "Permissions for this site"',
        'Set Camera to "Allow"',
        'Refresh the page'
      ],
      settingsPath: 'edge://settings/content/camera'
    };
  }
  
  return {
    browser: 'your browser',
    steps: [
      'Look for a camera icon in your address bar',
      'Click it to manage camera permissions',
      'Allow camera access for this site',
      'Refresh the page if needed'
    ],
    settingsPath: null
  };
};

export const CameraPermissionPrompt = ({ 
  status, 
  onRequestPermission, 
  onUploadInstead 
}: CameraPermissionPromptProps) => {
  const instructions = getBrowserInstructions();

  if (status === 'requesting') {
    return (
      <Card className="p-8 text-center bg-primary/5 border-primary/20">
        <div className="space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full">
              <Camera className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Requesting Camera Access</h3>
            <p className="text-muted-foreground text-sm">
              Please allow camera access when prompted by your browser
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Waiting for permission...</span>
          </div>
        </div>
      </Card>
    );
  }

  if (status === 'granted') {
    return (
      <Card className="p-6 text-center bg-green-500/10 border-green-500/20">
        <div className="flex items-center justify-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <span className="font-medium text-green-700 dark:text-green-400">
            Camera access granted!
          </span>
        </div>
      </Card>
    );
  }

  if (status === 'denied') {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Camera Access Blocked</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Camera permission was denied. Here's how to enable it in {instructions.browser}:
              </p>
            </div>
          </div>
          
          <div className="bg-card rounded-lg p-4 border">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              How to Enable Camera
            </h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onRequestPermission} variant="outline" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={onUploadInstead} className="flex-1">
              Upload Photo Instead
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (status === 'unavailable') {
    return (
      <Card className="p-6 border-amber-500/30 bg-amber-500/5">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-full">
              <Camera className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Camera Not Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No camera was detected on this device, or it's being used by another application.
              </p>
            </div>
          </div>
          
          <Button onClick={onUploadInstead} className="w-full">
            Upload Photo Instead
          </Button>
        </div>
      </Card>
    );
  }

  // Idle state - initial prompt
  return (
    <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Enable Camera Access</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Take photos directly from your camera for the best hairstyle recommendations
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onRequestPermission} className="flex-1">
            <Camera className="mr-2 h-4 w-4" />
            Enable Camera
          </Button>
          <Button onClick={onUploadInstead} variant="outline" className="flex-1">
            Upload Photo
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your photos stay on your device and are only used for analysis
        </p>
      </div>
    </Card>
  );
};
