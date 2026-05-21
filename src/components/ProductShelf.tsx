import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { RotatingBBCoin } from "./economy/RotatingBBCoin";
import { GearPurchaseModal } from "./GearPurchaseModal";
import { toast } from "sonner";

interface GearProduct {
  id: string;
  name: string;
  price_bb: number;
  image_url: string | null;
}

export const ProductShelf = () => {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<GearProduct | null>(null);

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
      toast.error("Please sign in to purchase gear");
      return;
    }
    setSelectedProduct(product);
  };

  if (products.length === 0) return null;

  return (
    <>
      <section className="px-3 sm:px-6 pt-0 pb-1">
        <div className="grid grid-cols-3 gap-1.5">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleTap(product)}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted border border-border transition-transform hover:scale-[1.02] text-left"
            >
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-1.5 z-10">
                <p className="text-[10px] font-semibold text-white truncate leading-tight drop-shadow">
                  {product.name}
                </p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <RotatingBBCoin size="xs" />
                  <p className="text-[10px] text-orange-500 font-bold leading-none drop-shadow">
                    {product.price_bb} BB
                  </p>
                </div>
              </div>
            </button>
          ))}

        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <ShoppingBag className="h-3 w-3 text-orange-500" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Official Gear</h3>
        </div>
      </section>

      <GearPurchaseModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct || { id: "", name: "", price_bb: 0, image_url: null }}
      />
    </>
  );
};
