import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Laptop, 
  CheckCircle2, 
  XCircle, 
  Lightbulb,
  Wifi,
  Monitor,
  Mic,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamSetupGuideProps {
  onSetupComplete?: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
}

export const StreamSetupGuide = ({ onSetupComplete }: StreamSetupGuideProps) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'camera', label: 'Camera is working', icon: <Camera className="h-4 w-4" />, checked: false },
    { id: 'mic', label: 'Microphone is clear', icon: <Mic className="h-4 w-4" />, checked: false },
    { id: 'lighting', label: 'Good lighting on work area', icon: <Lightbulb className="h-4 w-4" />, checked: false },
    { id: 'internet', label: 'Stable internet (10+ Mbps)', icon: <Wifi className="h-4 w-4" />, checked: false },
    { id: 'position', label: 'Camera positioned correctly', icon: <Monitor className="h-4 w-4" />, checked: false },
  ]);

  const toggleItem = (id: string) => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const allChecked = checklist.every(item => item.checked);
  const checkedCount = checklist.filter(item => item.checked).length;

  return (
    <Card className="card-gradient border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Stream Setup Guide
          </span>
          <Badge variant={allChecked ? 'default' : 'secondary'}>
            {checkedCount}/{checklist.length} Ready
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="browser" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browser" className="flex items-center gap-1">
              <Camera className="h-4 w-4" />
              Browser Stream
            </TabsTrigger>
            <TabsTrigger value="obs" className="flex items-center gap-1">
              <Laptop className="h-4 w-4" />
              OBS Studio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browser" className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>Easiest option!</strong> Stream directly from your browser with just one click.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>No software to install</li>
                <li>Works on any modern browser</li>
                <li>Automatic quality adjustment</li>
              </ul>
            </div>

            {/* Pre-stream checklist */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Pre-Stream Checklist:</p>
              {checklist.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                    item.checked 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "bg-muted/30 border-border hover:border-primary/50"
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.checked ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="obs" className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>Professional quality!</strong> Use OBS Studio for advanced features.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Higher quality streams</li>
                <li>Multi-camera support</li>
                <li>Custom overlays and scenes</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">Step 1: Download OBS</p>
                <a 
                  href="https://obsproject.com/download" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  obsproject.com/download →
                </a>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">Step 2: OBS Settings</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>• Output: 1280x720 or 1920x1080</li>
                  <li>• Bitrate: 3000-6000 Kbps</li>
                  <li>• Encoder: x264 or NVENC</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">Step 3: Get Stream Key</p>
                <p className="text-xs text-muted-foreground">
                  Click "Go LIVE" to get your unique RTMP URL and stream key.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tips section */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-primary mb-1">Pro Tips</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>• Use ring lights for even lighting</li>
                <li>• Position camera at a 45° angle</li>
                <li>• Close other apps using bandwidth</li>
                <li>• Test stream before going live</li>
              </ul>
            </div>
          </div>
        </div>

        {onSetupComplete && (
          <Button 
            onClick={onSetupComplete}
            className="w-full"
            disabled={!allChecked}
          >
            {allChecked ? 'Ready to Stream!' : `Complete ${checklist.length - checkedCount} more items`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
