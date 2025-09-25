import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBarberBucks } from "@/hooks/useBarberBucks";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundsModal = ({ isOpen, onClose }: AddFundsModalProps) => {
  const [amount, setAmount] = useState("");
  const { addBucks } = useBarberBucks();

  if (!isOpen) return null;

  const handleAddFunds = () => {
    const numAmount = parseInt(amount);
    if (numAmount > 0) {
      addBucks.mutate(numAmount);
      setAmount("");
    }
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Add Barber Bucks</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Add Barber Bucks to your account to support barbers and participate in the community.
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="text-sm"
                >
                  {quickAmount} BB
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Custom amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                className="flex-1"
              />
              <span className="flex items-center text-sm text-muted-foreground">BB</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleAddFunds}
              disabled={!amount || parseInt(amount) <= 0 || addBucks.isPending}
              className="flex-1"
            >
              {addBucks.isPending ? "Processing..." : "Add Funds"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};