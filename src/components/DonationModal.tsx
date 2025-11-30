import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useBarberBucks } from '@/hooks/useBarberBucks';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Coins, Heart, AlertCircle } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
}

// BB donation amounts (1 BB = $0.20, so 5 BB = $1)
const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export const DonationModal = ({ isOpen, onClose, creatorId, creatorName }: DonationModalProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { barberBucks, checkFunds, setShowAddFundsModal } = useBarberBucks();

  const getAmount = () => {
    if (selectedAmount) return selectedAmount;
    const custom = parseInt(customAmount);
    return !isNaN(custom) && custom >= 5 ? custom : null;
  };

  const handleDonation = async () => {
    const amount = getAmount();
    if (!amount) {
      toast.error('Please select or enter a valid amount (minimum 5 BB)');
      return;
    }

    if (!user) {
      toast.error('Please sign in to donate');
      return;
    }

    // Check if user has enough BB
    if (!checkFunds(amount)) {
      return; // checkFunds shows toast and opens AddFundsModal
    }

    setIsLoading(true);
    try {
      // Process BB donation via edge function
      const { data, error } = await supabase.functions.invoke('process-bb-donation', {
        body: {
          creator_id: creatorId,
          amount_bb: amount,
          message: message.trim() || undefined
        }
      });

      if (error) throw error;

      toast.success(`Successfully donated ${amount} BB to ${creatorName}!`);
      handleClose();
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

  const insufficientFunds = getAmount() ? barberBucks < getAmount()! : false;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Heart className="w-5 h-5 text-red-400" />
            Support {creatorName}
          </DialogTitle>
          <DialogDescription>
            Send Barber Bucks to show your appreciation. Every contribution helps creators continue their amazing work.
          </DialogDescription>
        </DialogHeader>

        {/* Current Balance */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border">
          <span className="text-sm text-muted-foreground">Your Balance:</span>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="font-bold text-yellow-500">{barberBucks.toLocaleString()} BB</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Preset Amounts */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Quick amounts</Label>
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
                  className="text-xs flex flex-col h-auto py-2"
                >
                  <span className="font-bold">{amount}</span>
                  <span className="text-[10px] opacity-70">BB</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <Label htmlFor="custom-amount" className="text-sm font-medium text-foreground mb-2 block">
              Or enter custom amount (min 5 BB)
            </Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-yellow-500" />
              <Input
                id="custom-amount"
                type="number"
                min="5"
                step="1"
                placeholder="Enter BB amount"
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
            <Label htmlFor="message" className="text-sm font-medium text-foreground mb-2 block">
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

          {/* Insufficient Funds Warning */}
          {insufficientFunds && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium">Insufficient Barber Bucks</p>
                <p className="text-xs text-muted-foreground">You need {(getAmount()! - barberBucks).toLocaleString()} more BB</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddFundsModal(true);
                }}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Add Funds
              </Button>
            </div>
          )}

          {/* Total Preview */}
          {getAmount() && !insufficientFunds && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Donation amount:</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-lg font-semibold text-yellow-500">
                    {getAmount()?.toLocaleString()} BB
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ≈ ${((getAmount()! / 5)).toFixed(2)} USD value
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDonation}
            disabled={!getAmount() || isLoading || insufficientFunds}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Processing...' : `Donate ${getAmount()?.toLocaleString() || '0'} BB`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
