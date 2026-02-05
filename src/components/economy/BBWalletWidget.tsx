import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotatingBBCoin } from './RotatingBBCoin';
import { Plus, ArrowDownToLine } from 'lucide-react';
import { toast } from 'sonner';

interface BBWalletWidgetProps {
  isBarber: boolean;
  barberBucks: number;
  avatarUrl?: string | null;
  displayName?: string;
  onAddFunds: () => void;
  onWithdraw?: () => void;
}

export const BBWalletWidget = ({
  isBarber,
  barberBucks,
  avatarUrl,
  displayName,
  onAddFunds,
  onWithdraw
}: BBWalletWidgetProps) => {
  const handleWithdraw = () => {
    if (onWithdraw) {
      onWithdraw();
    } else {
      toast.info('Withdrawal requests are processed within 3-5 business days. Contact support to initiate a withdrawal.');
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-center text-lg font-semibold">
          BB Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4 pb-4">
        {/* Rotating Coin */}
        <RotatingBBCoin
          avatarUrl={avatarUrl}
          displayName={displayName}
          size="lg"
          animate={true}
        />

        {/* Balance Display */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold text-primary">
              {barberBucks.toLocaleString()}
            </span>
            <span className="text-sm text-cyan-400 font-medium">BB</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Barber Bucks</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full">
          <Button 
            onClick={onAddFunds} 
            size="sm" 
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Funds
          </Button>
          
          {isBarber && (
            <Button 
              onClick={handleWithdraw} 
              size="sm" 
              variant="outline"
              className="flex-1 border-cyan-500/30 hover:bg-cyan-500/10"
            >
              <ArrowDownToLine className="h-4 w-4 mr-1" />
              Withdraw
            </Button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-[10px] text-muted-foreground text-center">
          Use BB for tournaments, donations, gear & more
        </p>
      </CardContent>
    </Card>
  );
};
