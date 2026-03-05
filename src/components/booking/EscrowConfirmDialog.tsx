import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, Gift } from 'lucide-react';

interface EscrowConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  appointmentType: string;
  serviceName: string;
  amount: number;
  currentBalance: number;
  scheduledAt: string;
  isDepositOnly?: boolean;
  remainderBb?: number;
  isFree?: boolean;
}

export function EscrowConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  appointmentType,
  serviceName,
  amount,
  currentBalance,
  scheduledAt,
  isDepositOnly = false,
  remainderBb = 0,
  isFree = false,
}: EscrowConfirmDialogProps) {
  const balanceAfter = currentBalance - amount;
  const insufficient = !isFree && balanceAfter < 0;

  const typeLabels: Record<string, string> = {
    standard: '📅 Standard',
    house_call: '🏠 House Call',
    sos: '🚨 Emergency SOS',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFree ? <Gift className="h-5 w-5 text-green-400" /> : <Lock className="h-5 w-5 text-primary" />}
            {isFree ? 'Confirm Free Appointment' : 'Confirm Escrow Payment'}
          </DialogTitle>
          <DialogDescription>
            {isFree
              ? 'This is a free introductory appointment — no BB will be charged.'
              : isDepositOnly
                ? 'A deposit will be held now. The remainder is due when the appointment is completed.'
                : 'Your BB will be held in escrow until the barber completes the appointment.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Type</span>
            <Badge variant="outline">{typeLabels[appointmentType] || appointmentType}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Service</span>
            <span className="text-sm font-medium">{serviceName || 'Custom'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">When</span>
            <span className="text-sm font-medium">
              {new Date(scheduledAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>

          {!isFree && (
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Current Balance</span>
                <span className="font-bold text-primary">{currentBalance.toLocaleString()} BB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">{isDepositOnly ? 'Deposit Now' : 'Escrow Amount'}</span>
                <span className="font-bold text-destructive">-{amount.toLocaleString()} BB</span>
              </div>
              {isDepositOnly && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Due on arrival</span>
                  <span>{remainderBb.toLocaleString()} BB</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-border pt-2">
                <span className="text-sm font-medium">Balance After</span>
                <span className={`font-bold ${insufficient ? 'text-destructive' : 'text-green-400'}`}>
                  {balanceAfter.toLocaleString()} BB
                </span>
              </div>
            </div>
          )}

          {isFree && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <Gift className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400 font-bold">No charge — free introductory service</span>
            </div>
          )}

          {insufficient && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">Insufficient funds. Add more BB first.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading || insufficient}
            className="bg-primary hover:bg-primary/90 font-bold"
          >
            {loading
              ? 'Processing...'
              : isFree
                ? 'CONFIRM FREE BOOKING'
                : `COMMIT ${amount.toLocaleString()} BB`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
