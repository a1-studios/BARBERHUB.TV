import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Volume2, VolumeX, Smartphone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AudioManager } from '@/utils/audioManager';

interface BattleSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BattleSettings = ({ isOpen, onClose }: BattleSettingsProps) => {
  const [volume, setVolume] = useState(AudioManager.getVolume() * 100);
  const [soundEnabled, setSoundEnabled] = useState(!AudioManager.isMuted());
  const [hapticEnabled, setHapticEnabled] = useState(
    localStorage.getItem('battleHapticEnabled') !== 'false'
  );
  const [chatEnabled, setChatEnabled] = useState(
    localStorage.getItem('battleChatEnabled') !== 'false'
  );

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    AudioManager.setVolume(newVolume / 100);
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEnabled(checked);
    AudioManager.toggleMute();
  };

  const handleHapticToggle = (checked: boolean) => {
    setHapticEnabled(checked);
    localStorage.setItem('battleHapticEnabled', checked.toString());
  };

  const handleChatToggle = (checked: boolean) => {
    setChatEnabled(checked);
    localStorage.setItem('battleChatEnabled', checked.toString());
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Settings Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background/95 backdrop-blur-lg rounded-lg shadow-2xl border border-border z-50 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <h2 className="text-xl font-bold">Battle Settings</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                ✕
              </Button>
            </div>

            <div className="space-y-6">
              {/* Sound Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                    <Label htmlFor="sound-toggle">Sound Effects</Label>
                  </div>
                  <Switch
                    id="sound-toggle"
                    checked={soundEnabled}
                    onCheckedChange={handleSoundToggle}
                  />
                </div>

                {soundEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="volume-slider">Volume: {Math.round(volume)}%</Label>
                    <Slider
                      id="volume-slider"
                      value={[volume]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </motion.div>
                )}
              </div>

              {/* Haptic Feedback */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <Label htmlFor="haptic-toggle">Haptic Feedback</Label>
                </div>
                <Switch
                  id="haptic-toggle"
                  checked={hapticEnabled}
                  onCheckedChange={handleHapticToggle}
                />
              </div>

              {/* Chat */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <Label htmlFor="chat-toggle">Live Chat</Label>
                </div>
                <Switch
                  id="chat-toggle"
                  checked={chatEnabled}
                  onCheckedChange={handleChatToggle}
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Settings are saved automatically
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
