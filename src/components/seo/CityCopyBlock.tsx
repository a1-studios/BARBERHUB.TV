import { MapPin, DollarSign, Users } from 'lucide-react';
import type { SeoCity } from '@/data/seoCities';

interface CityCopyBlockProps {
  city: SeoCity;
  serviceName?: string;
}

/**
 * Long-form editorial block for city/service landing pages.
 * Pulls intro copy, neighborhood list, and avg price from `seoCities.ts`.
 */
export default function CityCopyBlock({ city, serviceName }: CityCopyBlockProps) {
  const headline = serviceName
    ? `${serviceName} barbers across ${city.name}`
    : `Barbers across ${city.name}`;

  return (
    <section className="max-w-4xl mx-auto px-4 pb-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-4">{headline}</h2>
      <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">
        {city.intro}
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <Stat
          icon={<DollarSign className="h-4 w-4" />}
          label="Avg price"
          value={`$${city.avgPriceUsd}`}
        />
        <Stat
          icon={<MapPin className="h-4 w-4" />}
          label="Areas served"
          value={`${city.neighborhoods.length}+ neighborhoods`}
        />
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Metro population"
          value={`${(city.population / 1_000_000).toFixed(1)}M`}
        />
      </div>

      <div>
        <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Popular neighborhoods
        </h3>
        <ul className="flex flex-wrap gap-2">
          {city.neighborhoods.map((n) => (
            <li
              key={n}
              className="px-3 py-1.5 rounded-full border border-border bg-card text-sm"
            >
              {n}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-1">
        {icon} {label}
      </div>
      <p className="font-bold text-lg">{value}</p>
    </div>
  );
}
