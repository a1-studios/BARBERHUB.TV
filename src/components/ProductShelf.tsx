import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { RotatingBBCoin } from "./economy/RotatingBBCoin";
import { GearPurchaseModal } from "./GearPurchaseModal";
import { GearImageLightbox } from "./GearImageLightbox";
import { toast } from "sonner";

interface GearProduct {
  id: string;
  name: string;
  price_bb: number;
  image_url: string | null;
  image_urls: string[] | null;
}

// Highlight the word "Hub" in signature orange wherever it appears in a title.
const renderTitleWithHub = (text: string) => {
  const parts = text.split(/(\bHub\b)/gi);
  return parts.map((part, i) =>
    /^hub$/i.test(part) ? (
      <span key={i} className="text-orange-500">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

const RotatingImage = ({ images, alt }: { images: string[]; alt: string }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images.length]);
  return (
    <>
      {images.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </>
  );
};

export const ProductShelf = () => {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<GearProduct | null>(null);
  const [lightbox, setLightbox] = useState<{ product: GearProduct; images: string[] } | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["gear_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price_bb, image_url, image_urls")
        .eq("category", "gear")
        .eq("is_active", true)
        .order("price_bb", { ascending: true });

      if (error) throw error;
      return (data || []) as GearProduct[];
    },
  });

  const openLightbox = (product: GearProduct, images: string[]) => {
    if (images.length === 0) return;
    setLightbox({ product, images });
  };

  const openPurchase = (product: GearProduct) => {
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
          {products.map((product) => {
            const imgs = (product.image_urls && product.image_urls.length > 0
              ? product.image_urls
              : product.image_url
              ? [product.image_url]
              : []
            ).slice(0, 5);
            return (
              <div
                key={product.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted border border-border transition-transform hover:scale-[1.02]"
              >
                <button
                  type="button"
                  onClick={() => openLightbox(product, imgs)}
                  className="absolute inset-0 w-full h-full"
                  aria-label={`View ${product.name} images`}
                >
                  {imgs.length > 0 && <RotatingImage images={imgs} alt={product.name} />}

                  {/* Top gradient for title legibility */}
                  <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
                  {/* Bottom gradient for price legibility */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

                  {/* Title — top center */}
                  <div className="absolute top-1 left-0 right-0 px-1 z-10">
                    <p className="text-[10px] font-semibold text-white text-center truncate leading-tight drop-shadow">
                      {renderTitleWithHub(product.name)}
                    </p>
                  </div>
                </button>

                {/* Price pill — bottom center, tappable to buy */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openPurchase(product); }}
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 hover:bg-orange-500/90 active:scale-95 transition"
                  aria-label={`Buy ${product.name} for ${product.price_bb} BB`}
                >
                  <RotatingBBCoin size="xs" />
                  <span className="text-[10px] text-orange-300 font-bold leading-none drop-shadow">
                    {product.price_bb} BB
                  </span>
                </button>
              </div>
            );
          })}
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

      {lightbox && (
        <GearImageLightbox
          images={lightbox.images}
          productName={lightbox.product.name}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
};
