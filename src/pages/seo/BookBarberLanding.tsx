import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Star, Scissors, Clock, Shield } from 'lucide-react';
import { SEO_CITIES, SEO_SERVICES, findCity, findService } from '@/data/seoCities';
import SeoFAQ, { type FAQItem } from '@/components/seo/SeoFAQ';
import CityCopyBlock from '@/components/seo/CityCopyBlock';
import InternalLinkGrid from '@/components/seo/InternalLinkGrid';
import BreadcrumbsNav, { type Crumb } from '@/components/seo/BreadcrumbsNav';
import { trackSeoEvent } from '@/lib/seoAnalytics';

const BASE = 'https://barberhub-tv.lovable.app';

/**
 * SEO landing page that bridges local "barber near me" search intent into
 * the in-app booking flow. Used for three URL shapes:
 *  - /book-barber-near-me            (national hub)
 *  - /book-barber/:city              (city hub)
 *  - /book-barber/:city/:service     (long-tail service in city)
 */
export default function BookBarberLanding() {
  const { city: citySlug, service: serviceSlug } = useParams();
  const navigate = useNavigate();
  const city = findCity(citySlug);
  const service = findService(serviceSlug);

  // ---- Page metadata --------------------------------------------------------
  const cityLabel = city ? `${city.name}, ${city.state}` : 'Near You';
  const serviceLabel = service?.name ?? 'Barber';
  const h1 = service && city
    ? `Book a ${service.name} in ${city.name}, ${city.state}`
    : city
      ? `Book a Barber in ${city.name}, ${city.state}`
      : 'Book a Barber Near You — Online in 30 Seconds';

  const title = service && city
    ? `${service.name} in ${city.name}, ${city.state} | Book Online — Barber-Hub`
    : city
      ? `Barbers in ${city.name}, ${city.state} | Book Online — Barber-Hub`
      : 'Book a Barber Near Me | Online Barber Booking — Barber-Hub';

  const description = service && city
    ? `Book a ${service.keyword} in ${city.name} online. Real-time availability, verified barbers, instant confirmation. From $${service.priceFromUsd}.`
    : city
      ? `Find and book the top barbers in ${city.name}, ${city.state}. Live availability, verified reviews, no phone calls. Book online in 30 seconds.`
      : `Skip the phone call. Find verified barbers near you, see live availability, and book your next cut online — fades, beard trims, hot-towel shaves and more.`;

  const path = service && city
    ? `/book-barber/${city.slug}/${service.slug}`
    : city ? `/book-barber/${city.slug}` : '/book-barber-near-me';
  const canonical = `${BASE}${path}`;

  // ---- Tracking -------------------------------------------------------------
  useEffect(() => {
    trackSeoEvent('seo_landing_view', {
      city_slug: city?.slug ?? null,
      service_slug: service?.slug ?? null,
      variant: service && city ? 'service' : city ? 'city' : 'hub',
    });
  }, [city?.slug, service?.slug]);

  // ---- Structured data (LocalBusiness + FAQ + Breadcrumbs) ------------------
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: city ? `Barber-Hub Barbers — ${city.name}` : 'Barber-Hub',
    description,
    url: canonical,
    image: `${BASE}/og-image.png`,
    priceRange: '$$',
    ...(city && {
      areaServed: { '@type': 'City', name: city.name, addressRegion: city.state, addressCountry: 'US' },
    }),
    ...(service && {
      makesOffer: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: service.priceFromUsd,
        itemOffered: { '@type': 'Service', name: service.name, description: service.description },
      },
    }),
  };

  const faqItems: FAQItem[] = [
    {
      question: `How do I book a barber in ${cityLabel}?`,
      answer: `Open the Barber-Hub directory, filter by ${cityLabel}, pick a verified barber, choose a time and confirm. No phone calls, no waiting on hold.`,
    },
    {
      question: 'Do barbers confirm appointments instantly?',
      answer: 'Yes. Most barbers on Barber-Hub use real-time availability, so you get instant confirmation. A small Barber Bucks deposit holds your slot and is refunded if you cancel 2+ hours ahead.',
    },
    {
      question: `How much does a ${service?.name?.toLowerCase() ?? 'haircut'} cost in ${cityLabel}?`,
      answer: `Prices in ${cityLabel} typically start at $${service?.priceFromUsd ?? city?.avgPriceUsd ?? 25}. Each barber sets their own pricing visible upfront before you book.`,
    },
    {
      question: 'Can I book a house-call barber?',
      answer: 'Yes. Many Barber-Hub barbers offer house-call bounties — they come to you, your office, or your event. Set your bounty and verified barbers will accept the job.',
    },
    {
      question: 'Are reviews verified?',
      answer: 'Every review on Barber-Hub comes from a client who booked and paid for an appointment through the platform. No anonymous one-star drive-bys.',
    },
  ];

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Book a Barber', item: `${BASE}/book-barber-near-me` },
      ...(city ? [{ '@type': 'ListItem', position: 3, name: city.name, item: `${BASE}/book-barber/${city.slug}` }] : []),
      ...(service && city ? [{ '@type': 'ListItem', position: 4, name: service.name, item: canonical }] : []),
    ],
  };

  const visibleCrumbs: Crumb[] = [
    { label: 'Home', href: '/' },
    { label: 'Book a Barber', href: '/book-barber-near-me' },
    ...(city ? [{ label: city.name, href: `/book-barber/${city.slug}` }] : []),
    ...(service && city ? [{ label: service.name }] : []),
  ];

  // ---- CTA wiring -----------------------------------------------------------
  const handleFindBarbers = (label: string) => {
    trackSeoEvent('seo_cta_click', {
      city_slug: city?.slug ?? null,
      service_slug: service?.slug ?? null,
      label,
    });
    const q = city ? `?city=${encodeURIComponent(city.name)}` : '';
    navigate(`/barbers${q}`);
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(localBusiness)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbs)}</script>
      </Helmet>

      <main className="min-h-screen bg-background text-foreground">
        <BreadcrumbsNav crumbs={visibleCrumbs} />

        {/* Hero */}
        <section className="relative px-4 pt-10 pb-12 text-center max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">
            {city ? `${city.name} · ${city.state}` : 'United States'}
          </p>
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">{h1}</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {city?.tagline ?? description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => handleFindBarbers('hero_find_barbers')}
              className="font-bold"
            >
              <Scissors className="h-4 w-4 mr-2" />
              {service ? `Find ${service.name} Barbers` : 'Find Barbers'}
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link
                to="/barbers"
                onClick={() => trackSeoEvent('seo_cta_click', {
                  city_slug: city?.slug ?? null,
                  service_slug: service?.slug ?? null,
                  label: 'hero_browse_map',
                })}
              >
                <MapPin className="h-4 w-4 mr-2" /> Browse the Map
              </Link>
            </Button>
          </div>
        </section>

        {/* Trust strip */}
        <section className="grid grid-cols-3 gap-2 max-w-3xl mx-auto px-4 pb-12">
          <Trust icon={<Calendar className="h-5 w-5 text-primary" />} label="Instant booking" />
          <Trust icon={<Shield className="h-5 w-5 text-primary" />} label="Verified barbers" />
          <Trust icon={<Star className="h-5 w-5 text-primary" />} label="Real reviews" />
        </section>

        {/* City-specific long copy */}
        {city && <CityCopyBlock city={city} serviceName={service?.name} />}

        {/* Why book online (national hub only) */}
        {!city && (
          <section className="max-w-4xl mx-auto px-4 pb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Why book your next cut online?
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Card icon={<Clock />} title="No phone tag">
                See live availability for every barber and lock in a slot in seconds — even at 2am.
              </Card>
              <Card icon={<Shield />} title="Held by deposit">
                A small refundable deposit guarantees your appointment and protects your barber from no-shows.
              </Card>
              <Card icon={<Star />} title="Reviewed by clients">
                Every barber on Barber-Hub is reviewed by real, verified clients — no fake five-stars.
              </Card>
            </div>
          </section>
        )}

        {/* Service grid (city hub only) */}
        {city && !service && (
          <section className="max-w-4xl mx-auto px-4 pb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Popular services in {city.name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SEO_SERVICES.map((s) => (
                <Link
                  key={s.slug}
                  to={`/book-barber/${city.slug}/${s.slug}`}
                  onClick={() =>
                    trackSeoEvent('seo_internal_link_click', {
                      city_slug: city.slug,
                      service_slug: s.slug,
                      label: 'service_grid',
                    })
                  }
                  className="block p-4 rounded-lg border border-border hover:border-primary/60 transition-colors"
                >
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From ${s.priceFromUsd} · {s.durationMin}min
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Internal link grid (sibling cities + other services) */}
        <InternalLinkGrid currentCity={city} currentServiceSlug={service?.slug} />

        {/* All cities (hub only) */}
        {!city && (
          <section className="max-w-4xl mx-auto px-4 pb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">All cities</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {SEO_CITIES.map((c) => (
                <Link
                  key={c.slug}
                  to={`/book-barber/${c.slug}`}
                  onClick={() =>
                    trackSeoEvent('seo_internal_link_click', {
                      city_slug: c.slug,
                      label: 'all_cities',
                    })
                  }
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Barbers in {c.name}, {c.state}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <SeoFAQ items={faqItems} citySlug={city?.slug} serviceSlug={service?.slug} />

        {/* Final CTA */}
        <section className="bg-primary/10 border-t border-primary/20 py-16 px-4 text-center">
          <h2 className="text-3xl font-black mb-3">Ready for your best cut?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands using Barber-Hub to skip the wait and book the right barber
            {city ? ` in ${city.name}` : ' near them'}.
          </p>
          <Button
            size="lg"
            onClick={() => handleFindBarbers('footer_find_barbers')}
            className="font-bold"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Book {serviceLabel} {city ? `in ${city.name}` : 'Now'}
          </Button>
        </section>
      </main>
    </>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border">
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-lg border border-border bg-card">
      <div className="text-primary mb-3 [&>svg]:h-6 [&>svg]:w-6">{icon}</div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
