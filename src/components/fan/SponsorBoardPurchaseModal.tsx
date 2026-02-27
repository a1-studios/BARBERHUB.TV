import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Clock, Zap, Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SponsorBoardPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  barberBucks: number;
  userId: string;
  displayName?: string;
}

const TIERS = [
  { days: 1, cost: 50, label: '1 Day', icon: Clock, accent: 'border-muted-foreground/30' },
  { days: 3, cost: 120, label: '3 Days', icon: Zap, accent: 'border-primary/40', popular: true },
  { days: 7, cost: 250, label: '7 Days', icon: Crown, accent: 'border-amber-500/40' },
];

export function SponsorBoardPurchaseModal({
  isOpen,
  onClose,
  barberBucks,
  userId,
  displayName,
}: SponsorBoardPurchaseModalProps) {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const queryClient = useQueryClient();

  const handlePurchase = async () => {
    if (selectedTier === null) return;
    const tier = TIERS[selectedTier];

    if (barberBucks < tier.cost) {
      toast.error(`Need ${tier.cost} BB, you have ${barberBucks} BB.`);
      return;
    }

    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-sponsor-slot', {
        body: {
          duration_days: tier.days,
          name: displayName || 'Sponsor',
          message: message || undefined,
          link: link || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`You're now an Official Sponsor for ${tier.days} day${tier.days > 1 ? 's' : ''}! 🎉`);
      queryClient.invalidateQueries({ queryKey: ['barber_bucks'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['sponsor-ads'] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to purchase sponsor slot');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            Become an Official Sponsor
          </DialogTitle>
          <DialogDescription>
            Get featured on the Arena Ticker and earn the Official Sponsor badge
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Tier Selection */}
          {TIERS.map((tier, idx) => (
            <Card
              key={tier.days}
              className={`cursor-pointer transition-all ${
                selectedTier === idx
                  ? 'border-primary ring-1 ring-primary/30'
                  : tier.accent
              } hover:border-primary/60`}
              onClick={() => setSelectedTier(idx)}
            >
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <tier.icon className={`h-5 w-5 ${selectedTier === idx ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{tier.label}</span>
                      {tier.popular && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary/80">
                          Best Value
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Sponsor board + badge</p>
                  </div>
                </div>
                <span className="font-bold text-primary">{tier.cost} BB</span>
              </CardContent>
            </Card>
          ))}

          {/* Custom message */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs text-muted-foreground">Sponsor Message (optional)</Label>
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Your message on the ticker..."
              maxLength={100}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Link (optional)</Label>
            <Input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://..."
              className="h-8 text-sm"
            />
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Your balance</span>
            <span className="font-semibold text-foreground">{barberBucks.toLocaleString()} BB</span>
          </div>

          <Button
            className="w-full"
            onClick={handlePurchase}
            disabled={selectedTier === null || isPurchasing}
          >
            {isPurchasing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Award className="h-4 w-4 mr-2" />
            )}
            {selectedTier !== null
              ? `Purchase for ${TIERS[selectedTier].cost} BB`
              : 'Select a tier'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
