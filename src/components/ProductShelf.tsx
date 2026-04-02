import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { RotatingBBCoin } from "./economy/RotatingBBCoin";
import { GearPurchaseModal } from "./GearPurchaseModal";
import { AuthDialog } from "./auth/AuthDialog";

interface GearProduct {
  id: string;
  name: string;
  price_bb: number;
  image_url: string | null;
}

export const ProductShelf = () => {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<GearProduct | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["gear_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_bb, image_url")
        .eq("category", "gear")
        .eq("is_active", true)
        .order("price_bb", { ascending: true });

      if (error) throw error;
      return (data || []) as GearProduct[];
    },
  });

  const handleTap = (product: GearProduct) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setSelectedProduct(product);
  };

  return (
    <>
      <section className="px-3 sm:px-6 py-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ShoppingBag className="h-3 w-3 text-orange-500" />
          <h3 className="text-xs font-bold text-foreground">Official Gear</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleTap(product)}
              className="flex flex-col items-center gap-1 rounded-lg bg-card border border-border p-2 transition-colors hover:bg-accent text-left"
            >
              <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              <p className="text-[10px] font-semibold text-foreground truncate w-full text-center leading-tight">
                {product.name}
              </p>
              <div className="flex items-center gap-0.5">
                <RotatingBBCoin size={10} />
                <p className="text-[10px] text-orange-500 font-bold leading-none">
                  {product.price_bb} BB
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <GearPurchaseModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct || { id: "", name: "", price_bb: 0, image_url: null }}
      />

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </>
  );
};
