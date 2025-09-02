import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Heart } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export const DonationModal = ({ isOpen, onClose, creatorId, creatorName }: DonationModalProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getAmount = () => {
    if (selectedAmount) return selectedAmount;
    const custom = parseFloat(customAmount);
    return !isNaN(custom) && custom >= 1 ? custom : null;
  };

  const handleDonation = async () => {
    const amount = getAmount();
    if (!amount) {
      toast.error('Please select or enter a valid amount (minimum $1.00)');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-donation', {
        body: {
          creator_id: creatorId,
          amount_cents: Math.round(amount * 100),
          currency: 'usd',
          message: message.trim() || undefined
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        onClose();
        toast.success('Opening donation page...');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Donation error:', error);
      toast.error(error.message || 'Failed to process donation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Heart className="w-5 h-5 text-red-400" />
            Support {creatorName}
          </DialogTitle>
          <DialogDescription>
            Show your appreciation with a donation. Every contribution helps creators continue their amazing work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preset Amounts */}
          <div>
            <Label className="text-sm font-medium text-white mb-3 block">Quick amounts</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  disabled={isLoading}
                  className="text-xs"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <Label htmlFor="custom-amount" className="text-sm font-medium text-white mb-2 block">
              Or enter custom amount
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="custom-amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message" className="text-sm font-medium text-white mb-2 block">
              Message (optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Leave a supportive message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              maxLength={500}
              rows={3}
              className="resize-none"
            />
            {message.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {message.length}/500 characters
              </p>
            )}
          </div>

          {/* Total Preview */}
          {getAmount() && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Donation amount:</span>
                <span className="text-lg font-semibold text-primary">
                  ${getAmount()?.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDonation}
            disabled={!getAmount() || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Processing...' : `Donate $${getAmount()?.toFixed(2) || '0.00'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};