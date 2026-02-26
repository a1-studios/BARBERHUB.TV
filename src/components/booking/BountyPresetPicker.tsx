import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface BountyPresetPickerProps {
  value: number;
  onChange: (value: number) => void;
  minAmount?: number;
}

const PRESETS = [
  { label: '750 BB', value: 750 },
  { label: '1,200 BB', value: 1200 },
  { label: '2,000 BB', value: 2000 },
];

export function BountyPresetPicker({ value, onChange, minAmount = 500 }: BountyPresetPickerProps) {
  const [customMode, setCustomMode] = useState(!PRESETS.some(p => p.value === value) && value !== 0);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-muted-foreground">Set Your Bounty</Label>
      
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.value}
            type="button"
            variant={value === preset.value && !customMode ? 'default' : 'outline'}
            className={cn(
              'font-bold text-xs h-9',
              value === preset.value && !customMode 
                ? 'bg-accent hover:bg-accent/90 text-accent-foreground border-accent' 
                : 'border-accent/30 hover:border-accent/60 hover:bg-accent/10'
            )}
            onClick={() => {
              setCustomMode(false);
              onChange(preset.value);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="space-y-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-amber-400"
          onClick={() => setCustomMode(true)}
        >
          Or enter custom amount
        </Button>
        
        {customMode && (
          <div className="relative">
            <Input
              type="number"
              min={minAmount}
              value={value || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                onChange(Math.max(val, 0));
              }}
              placeholder={`Min ${minAmount} BB`}
              className="pr-12 border-amber-500/30 focus:border-amber-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">BB</span>
          </div>
        )}
        
        {value > 0 && value < minAmount && (
          <p className="text-xs text-destructive">Minimum {minAmount} BB required</p>
        )}
      </div>
    </div>
  );
}
