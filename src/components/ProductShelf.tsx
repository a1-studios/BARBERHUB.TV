import { useEffect, useState } from 'react';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  title: string;
  priceCents: number;
  imageUrl: string;
  externalLink: string;
  type: 'proprietary' | 'affiliate';
}

const PROPRIETARY_PRODUCTS: Product[] = [
  {
    id: 'prop-cape',
    title: 'Barber-Hub Cape',
    priceCents: 3999,
    imageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&h=300&fit=crop',
    externalLink: '#',
    type: 'proprietary',
  },
  {
    id: 'prop-hat',
    title: 'Barber-Hub Snapback',
    priceCents: 2999,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=300&h=300&fit=crop',
    externalLink: '#',
    type: 'proprietary',
  },
  {
    id: 'prop-razor',
    title: 'Precision Razor',
    priceCents: 4999,
    imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=300&h=300&fit=crop',
    externalLink: '#',
    type: 'proprietary',
  },
];

export const ProductShelf = () => {
  const [affiliateProducts, setAffiliateProducts] = useState<Product[]>([]);
  const [affiliateEnabled, setAffiliateEnabled] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('platform_state')
        .select('value')
        .eq('key', 'affiliate_network_enabled')
        .single();

      const enabled = data?.value === 'true';
      setAffiliateEnabled(enabled);

      if (enabled) {
        const { data: products } = await supabase
          .from('affiliate_products')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (products) {
          setAffiliateProducts(
            products.map((p: any) => ({
              id: p.id,
              title: p.title,
              priceCents: p.price_cents,
              imageUrl: p.image_url,
              externalLink: p.external_link,
              type: 'affiliate' as const,
            }))
          );
        }
      }
    };

    fetchConfig();
  }, []);

  const allProducts = affiliateEnabled
    ? [...PROPRIETARY_PRODUCTS, ...affiliateProducts]
    : PROPRIETARY_PRODUCTS;

  const formatPrice = (cents: number) =>
    `$${(cents / 100).toFixed(2)}`;

  return (
    <section className="px-3 sm:px-6 py-3">
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-bold text-foreground">Official Gear</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-1 px-1">
        {allProducts.map((product) => (
          <a
            key={product.id}
            href={product.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="snap-start shrink-0 w-[140px] rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden group transition-transform hover:scale-[1.02]"
          >
            <div className="h-[100px] overflow-hidden bg-black/20">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
            <div className="p-2 space-y-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {product.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(product.priceCents)}
              </p>
              <div className="flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold rounded-md py-1 transition-colors">
                Buy Now
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
