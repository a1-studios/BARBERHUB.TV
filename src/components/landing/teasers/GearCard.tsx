import { motion } from 'framer-motion';
import { ShoppingBag, Coins } from 'lucide-react';
import { ProductTease } from './useLandingData';

interface Props {
  products: ProductTease[];
}

export const GearCard = ({ products }: Props) => {
  const items = products.slice(0, 4);
  const hero = items[0];
  const rest = items.slice(1, 4);

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-orange-400/15 text-orange-300 border border-orange-400/40">
          <ShoppingBag className="h-3 w-3" /> Hub Gear
        </span>
        <span className="text-[10px] text-white/60">Pay in BB · Real shop</span>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-orange-500/[0.06] via-transparent to-transparent p-2 flex gap-2">
        {hero ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative flex-1 rounded-lg overflow-hidden border border-white/10 bg-black/40"
          >
            {hero.image_url ? (
              <img src={hero.image_url} alt={hero.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-rose-900 flex items-center justify-center text-5xl">💈</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute top-2 left-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-orange-300 border border-orange-400/40">
              {hero.category ?? 'Gear'}
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <div className="text-sm font-bold text-white truncate drop-shadow">{hero.name}</div>
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/90 text-[11px] font-bold text-white">
                <Coins className="h-3 w-3" /> {hero.price_bb} BB
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 rounded-lg border border-white/10 flex items-center justify-center text-white/40 text-xs">
            Restocking soon
          </div>
        )}

        <div className="flex-none w-[34%] flex flex-col gap-2">
          {rest.length > 0
            ? rest.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="relative flex-1 rounded-md overflow-hidden border border-white/10 bg-black/40"
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-700 to-indigo-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="text-[9px] text-white font-semibold truncate">{p.name}</div>
                    <div className="text-[9px] text-orange-300 font-bold">{p.price_bb} BB</div>
                  </div>
                </motion.div>
              ))
            : Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-md border border-white/5 bg-white/[0.02]" />
              ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Spend BB · Shipped worldwide</span>
        <span className="text-orange-300">Shop inside →</span>
      </div>
    </div>
  );
};

export default GearCard;
