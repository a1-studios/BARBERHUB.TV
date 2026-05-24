import { motion } from 'framer-motion';
import { Calendar, MapPin, Star, Radio } from 'lucide-react';
import { countryFlag, BarberDetail, PublicBarber } from './useLandingData';

interface Props {
  featured: BarberDetail | null;
  fallbackBarber: PublicBarber | null;
}

const fmtSlot = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTmrw = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  if (isTmrw) return `Tmrw ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`;
};

export const BookingCard = ({ featured, fallbackBarber }: Props) => {
  const display_name = featured?.display_name ?? fallbackBarber?.display_name ?? 'New Barber';
  const avatar_url = featured?.avatar_url ?? fallbackBarber?.avatar_url ?? null;
  const country_code = featured?.country_code ?? fallbackBarber?.country_code ?? null;
  const specialty = featured?.specialty?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  const rating = featured?.rating && featured.rating > 0 ? featured.rating : null;
  const years = featured?.years_experience ?? null;
  const city = featured?.shop_city ?? null;
  const isLive = !!featured?.is_live;
  const slots = featured?.open_slots ?? [];
  const cuts = featured?.cuts_this_month ?? 0;

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/40">
          <Calendar className="h-3 w-3" /> Book in 60s
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-rose-300 font-semibold">
            <Radio className="h-3 w-3 animate-pulse" /> Live now
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold">
            <MapPin className="h-3 w-3" /> {city ?? 'Worldwide'}
          </span>
        )}
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-cyan-500/[0.06] via-transparent to-transparent p-3 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 ring-2 ring-orange-400/40 flex items-center justify-center overflow-hidden">
            {avatar_url ? (
              <img src={avatar_url} alt={display_name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl">{countryFlag(country_code)}</span>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#0a0a0f] ${isLive ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">{display_name}</span>
              {years != null && years >= 3 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-400/20 text-yellow-300 font-semibold">PRO</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/60">
              {rating != null ? (
                <>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {rating.toFixed(1)}
                  <span>·</span>
                </>
              ) : null}
              <span>{countryFlag(country_code)} {country_code ?? '—'}</span>
              {years != null ? <><span>·</span><span>{years}y</span></> : null}
            </div>
          </div>
        </div>

        {specialty.length > 0 ? (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {specialty.slice(0, 3).map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/80 capitalize">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <div className="mb-3 text-[10px] text-white/40 italic">Specialty not set yet</div>
        )}

        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50 mb-1.5">
          <span>Next available</span>
          {cuts > 0 && <span className="text-emerald-300 normal-case tracking-normal">{cuts} cuts this month</span>}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(slots.length ? slots : [null, null, null]).map((iso, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className={`text-center text-[11px] py-1.5 rounded-md border font-semibold ${
                iso
                  ? 'bg-cyan-400/10 border-cyan-400/40 text-cyan-200'
                  : 'bg-white/[0.03] border-white/10 text-white/30'
              }`}
            >
              {iso ? fmtSlot(iso) : '—'}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/70 font-medium">Real barbers · Real chairs</span>
        <span className="text-cyan-300">Book inside →</span>
      </div>
    </div>
  );
};
