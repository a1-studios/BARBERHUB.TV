import { Link } from 'react-router-dom';
import { trackSeoEvent } from '@/lib/seoAnalytics';
import { SEO_CITIES, SEO_SERVICES, type SeoCity } from '@/data/seoCities';

interface InternalLinkGridProps {
  currentCity?: SeoCity;
  currentServiceSlug?: string;
}

/**
 * Crawl-depth booster: "Other cities" and (when on a city page) "Other services".
 * All clicks tracked for internal-funnel analysis.
 */
export default function InternalLinkGrid({ currentCity, currentServiceSlug }: InternalLinkGridProps) {
  const siblingCities = SEO_CITIES
    .filter((c) => c.slug !== currentCity?.slug)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);

  const otherServices = currentCity
    ? SEO_SERVICES.filter((s) => s.slug !== currentServiceSlug)
    : [];

  const onClick = (label: string, href: string) =>
    trackSeoEvent('seo_internal_link_click', {
      city_slug: currentCity?.slug ?? null,
      service_slug: currentServiceSlug ?? null,
      target: href,
      label,
    });

  return (
    <section className="max-w-4xl mx-auto px-4 pb-16 space-y-10">
      {currentCity && otherServices.length > 0 && (
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            More services in {currentCity.name}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {otherServices.map((s) => {
              const href = `/book-barber/${currentCity.slug}/${s.slug}`;
              return (
                <Link
                  key={s.slug}
                  to={href}
                  onClick={() => onClick(`${s.name} in ${currentCity.name}`, href)}
                  className="block p-4 rounded-lg border border-border hover:border-primary/60 hover:bg-card transition-colors"
                >
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From ${s.priceFromUsd} · {s.durationMin}min
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          {currentCity ? 'Other cities we cover' : 'Top cities'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {siblingCities.map((c) => {
            const href = `/book-barber/${c.slug}`;
            return (
              <Link
                key={c.slug}
                to={href}
                onClick={() => onClick(`Barbers in ${c.name}`, href)}
                className="text-muted-foreground hover:text-primary transition-colors py-1"
              >
                Barbers in {c.name}, {c.state}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
