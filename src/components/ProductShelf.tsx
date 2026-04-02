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
    <section className="px-3 sm:px-6 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <ShoppingBag className="h-3 w-3 text-orange-500" />
        <h3 className="text-xs font-bold text-foreground">Official Gear</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {allProducts.map((product) => (
          <a
            key={product.id}
            href={product.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-lg bg-card border border-border p-2 transition-colors hover:bg-accent"
          >
            <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="text-[10px] font-semibold text-foreground truncate w-full text-center leading-tight">
              {product.title}
            </p>
            <p className="text-[10px] text-orange-500 font-bold leading-none">
              {formatPrice(product.priceCents)}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
};
