# 02 — Schema / JSON-LD reference

Every structured-data block we emit, where it lives, and a copy-paste
template. Validate any change with the [Rich Results Test](https://search.google.com/test/rich-results) before merging.

## Where each schema lives

| Schema | Page(s) | Lives in |
| --- | --- | --- |
| Organization | sitewide | `index.html` (missing — add) |
| WebSite + SearchAction | sitewide | `index.html` (missing — add) |
| HairSalon (LocalBusiness) | `/book-barber/:city[/:service]`, `/barber/:userId` | Helmet in component |
| Offer | `/book-barber/:city/:service` | Helmet in `BookBarberLanding` ✅ |
| FAQPage | every city/service page, `/grants` if FAQ added | Helmet ✅ |
| BreadcrumbList | every nested page | Helmet ✅ |
| VideoObject | `/watch`, `/barber/:userId` portfolio items | Helmet (missing — add) |
| Event | `/tournaments/:tournamentId` | Helmet (missing — add) |
| Review / AggregateRating | `/barber/:userId` (only when real reviews exist) | Helmet (missing — add) |

Never emit Review/AggregateRating with fake or zero data — Google penalizes.

## Templates

### Organization — sitewide

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Barber-Hub",
  "url": "https://barberhub-tv.lovable.app",
  "logo": "https://barberhub-tv.lovable.app/og-image.png",
  "sameAs": [
    "https://www.instagram.com/barberhub.tv",
    "https://www.tiktok.com/@barberhub.tv"
  ]
}
```

### WebSite + SearchAction — sitewide

Enables the Google sitelinks search box.

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://barberhub-tv.lovable.app",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://barberhub-tv.lovable.app/barbers?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### HairSalon — city / service / barber pages

```json
{
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "name": "Barber-Hub — Fade haircut in Austin, TX",
  "url": "https://barberhub-tv.lovable.app/book-barber/austin/fade",
  "image": "https://barberhub-tv.lovable.app/og-image.png",
  "areaServed": { "@type": "City", "name": "Austin" },
  "priceRange": "$$",
  "telephone": "+1-000-000-0000"
}
```

### Offer — service page

```json
{
  "@context": "https://schema.org",
  "@type": "Offer",
  "name": "Fade haircut in Austin, TX",
  "price": "25",
  "priceCurrency": "USD",
  "availability": "https://schema.org/InStock",
  "url": "https://barberhub-tv.lovable.app/book-barber/austin/fade"
}
```

### FAQPage — every landing page

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does a fade cost in Austin?",
      "acceptedAnswer": { "@type": "Answer", "text": "Most barbers on Barber-Hub charge $20–$45 for a fade." }
    }
  ]
}
```

### BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://barberhub-tv.lovable.app/" },
    { "@type": "ListItem", "position": 2, "name": "Book a barber", "item": "https://barberhub-tv.lovable.app/book-barber-near-me" },
    { "@type": "ListItem", "position": 3, "name": "Austin", "item": "https://barberhub-tv.lovable.app/book-barber/austin" },
    { "@type": "ListItem", "position": 4, "name": "Fade" }
  ]
}
```

### VideoObject — `/watch` and portfolio items

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Mid-fade tutorial — Marcus B.",
  "description": "Step-by-step mid-fade from Marcus B. on Barber-Hub.",
  "thumbnailUrl": ["https://videodelivery.net/<uid>/thumbnails/thumbnail.jpg"],
  "uploadDate": "2026-05-01",
  "duration": "PT2M15S",
  "contentUrl": "https://videodelivery.net/<uid>/manifest/video.m3u8",
  "embedUrl": "https://iframe.videodelivery.net/<uid>"
}
```

### Event — tournaments

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Barber-Hub 2026 Global Championship — Round of 32",
  "startDate": "2026-06-15T18:00:00-04:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
  "location": {
    "@type": "VirtualLocation",
    "url": "https://barberhub-tv.lovable.app/tournaments/<id>"
  },
  "organizer": { "@type": "Organization", "name": "Barber-Hub" }
}
```

## How to add a new schema

1. Pick the type from [schema.org](https://schema.org).
2. Add the template above (or a new one) to the route's `<Helmet>`.
3. Run the [Rich Results Test](https://search.google.com/test/rich-results) on the preview URL.
4. After deploy, re-test on production URL and submit to GSC.
5. Document the new schema in the table at the top of this file.
