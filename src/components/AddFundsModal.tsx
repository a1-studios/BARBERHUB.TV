import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBarberBucks } from "@/hooks/useBarberBucks";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFundsModal = ({ isOpen, onClose }: AddFundsModalProps) => {
  const { purchaseBucks } = useBarberBucks();

  if (!isOpen) return null;

  const handleAddFunds = (amount: number) => {
    purchaseBucks.mutate(amount);
  };

  const quickAmounts = [100, 500, 1000, 2500];

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
          <p className="text-sm text-muted-foreground mb-4">
            Purchase Barber Bucks to vote, enter tournaments, and support creators.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                onClick={() => handleAddFunds(amount)}
                disabled={purchaseBucks.isPending}
                className="h-auto flex flex-col items-center py-4"
              >
                <span className="text-xl font-bold">{amount}</span>
                <span className="text-xs text-muted-foreground">Barber Bucks</span>
                <span className="text-sm font-semibold mt-1">
                  ${(amount / 100).toFixed(2)}
                </span>
              </Button>
            ))}
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};