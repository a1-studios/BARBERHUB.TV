import { useState } from "react";
import { createPortal } from "react-dom";
import { X, ShoppingBag, Coins, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBarberBucks } from "@/hooks/useBarberBucks";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AddFundsModal } from "./AddFundsModal";
import { RotatingBBCoin } from "./economy/RotatingBBCoin";
import { cn } from "@/lib/utils";

interface GearProduct {
  id: string;
  name: string;
  price_bb: number;
  image_url: string | null;
}

interface GearPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: GearProduct;
}

export const GearPurchaseModal = ({ isOpen, onClose, product }: GearPurchaseModalProps) => {
  const { user } = useAuth();
  const { barberBucks } = useBarberBucks();
  const queryClient = useQueryClient();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);

  if (!isOpen && !showAddFunds) return null;

  const hasEnough = barberBucks >= product.price_bb;
  const deficit = product.price_bb - barberBucks;

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please sign in to purchase gear");
      return;
    }

    if (!hasEnough) {
      onClose();
      setShowAddFunds(true);
      return;
    }

    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-product-bb", {
        body: { product_id: product.id, quantity: 1 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["barber_bucks"] });
      toast.success(`🛒 ${product.name} purchased!`, {
        description: `${product.price_bb} BB deducted from your wallet.`,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Purchase failed");
    } finally {
      setIsPurchasing(false);
    }
  };

  const modal = isOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div className="relative w-[90vw] max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Product header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{product.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <RotatingBBCoin size={16} />
                  <span className="text-sm font-bold text-orange-500">
                    {product.price_bb} BB
                  </span>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 mb-4",
                hasEnough
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
                Your Balance
              </div>
              <span
                className={cn(
                  "text-sm font-bold",
                  hasEnough ? "text-green-500" : "text-destructive"
                )}
              >
                {barberBucks} BB
              </span>
            </div>

            {/* Insufficient funds warning */}
            {!hasEnough && (
              <div className="flex items-start gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 mb-4">
                <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-300">
                  You need <span className="font-bold text-orange-500">{deficit} more BB</span> to
                  get this gear.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePurchase}
                disabled={isPurchasing}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs"
              >
                {isPurchasing
                  ? "Processing…"
                  : hasEnough
                  ? "Confirm Purchase"
                  : `Add ${deficit} BB`}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {modal}
      <AddFundsModal
        isOpen={showAddFunds}
        onClose={() => setShowAddFunds(false)}
      />
    </>
  );
};
