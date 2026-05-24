import { motion } from 'framer-motion';
import { Calendar, MapPin, Star } from 'lucide-react';

const SLOTS = ['9:00', '10:30', '12:00', '1:30', '3:00', '4:30'];
// Mark some as booked for liveness
const BOOKED = new Set([0, 2, 3]);

export const BookingCard = () => {
  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/40">
          <Calendar className="h-3 w-3" /> Book in 60s
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold">
          <MapPin className="h-3 w-3" /> Near You
        </span>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-cyan-500/[0.06] via-transparent to-transparent p-3 flex flex-col">
        {/* Barber row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 ring-2 ring-orange-400/40 flex items-center justify-center text-xl">
            🇺🇸
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0f]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">Andre "The Blade"</span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-400/20 text-yellow-300 font-semibold">PRO</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/60">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 4.9
              <span>·</span>
              <span>2.1 mi</span>
            </div>
          </div>
        </div>

        {/* Specialty pills */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {['✂️ Fades', '🪒 Lineup', '🔥 Designs'].map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/80">
              {s}
            </span>
          ))}
        </div>

        {/* Today's slots */}
        <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5">Today's slots</div>
        <div className="grid grid-cols-3 gap-1.5">
          {SLOTS.map((time, i) => {
            const booked = BOOKED.has(i);
            return (
              <motion.div
                key={time}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className={`text-center text-[11px] py-1.5 rounded-md border font-semibold ${
                  booked
                    ? 'bg-white/[0.03] border-white/10 text-white/30 line-through'
                    : 'bg-cyan-400/10 border-cyan-400/40 text-cyan-200'
                }`}
              >
                {time}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Real barbers · Real chairs</span>
        <span className="text-cyan-300">Book inside →</span>
      </div>
    </div>
  );
};
