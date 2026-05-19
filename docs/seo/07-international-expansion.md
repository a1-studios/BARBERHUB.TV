# 07 — International expansion

Plan for cloning the US programmatic surface into Booksy's other strong
markets (PL, UK, ES) and beyond.

## Why these markets

Per Semrush, Booksy's organic traffic by country:

| Market | Booksy /mo | Our priority |
| --- | --- | --- |
| United States | 2.6M | Live ✅ |
| Poland | 1.8M | 1st clone |
| United Kingdom | 870K | 2nd clone |
| Spain | 656K | 3rd clone |
| Brazil | 410K | 4th clone |
| Germany | 290K | 5th clone |

PL/UK/ES alone is ~3.3M monthly searches. Realistic capture at 1% in
year 1 = 33k visits/month, ~3× our current ceiling.

## URL strategy

We use **sub-path locales**, not subdomains or ccTLDs:

```
/                              ← en-US (default)
/uk/                           ← en-GB
/es/                           ← es-ES
/pl/                           ← pl-PL
/uk/book-barber/london/fade    ← long-tail leaf
```

Sub-paths consolidate authority on one domain. Subdomains would split
it; ccTLDs require new domains and separate authority builds.

## hreflang implementation

Every localized page MUST emit hreflang annotations for every language
version that exists, including a self-reference and an `x-default`:

```html
<link rel="alternate" hreflang="en-US" href="https://barberhub-tv.lovable.app/book-barber/austin/fade" />
<link rel="alternate" hreflang="en-GB" href="https://barberhub-tv.lovable.app/uk/book-barber/austin/fade" />
<link rel="alternate" hreflang="es-ES" href="https://barberhub-tv.lovable.app/es/book-barber/austin/fade" />
<link rel="alternate" hreflang="x-default" href="https://barberhub-tv.lovable.app/book-barber/austin/fade" />
```

Rules:
- Reciprocal: page A links to B, B must link back to A.
- Self-reference is required.
- `x-default` points at the page that serves users with no language match (we use en-US).
- Emit via Helmet on each route, not globally in `index.html`.

## Locale-aware data

Add to `src/data/seoCities.ts` (or a new `seoCitiesByLocale.ts`):

```ts
export const SEO_LOCALES = {
  'en-US': { path: '', currency: 'USD', cities: US_CITIES, services: US_SERVICES },
  'en-GB': { path: '/uk', currency: 'GBP', cities: UK_CITIES, services: UK_SERVICES },
  'es-ES': { path: '/es', currency: 'EUR', cities: ES_CITIES, services: ES_SERVICES },
  'pl-PL': { path: '/pl', currency: 'PLN', cities: PL_CITIES, services: PL_SERVICES },
};
```

`BookBarberLanding` reads locale from the URL prefix and pulls the
correct data.

## First-5 cities per market

Don't launch a market with one city. Launch with 5 metros so the
internal-link grid has weight.

| Market | Launch cities |
| --- | --- |
| en-GB | London, Manchester, Birmingham, Leeds, Glasgow |
| es-ES | Madrid, Barcelona, Valencia, Sevilla, Bilbao |
| pl-PL | Warszawa, Kraków, Wrocław, Poznań, Gdańsk |

## Translation workflow

1. Lock the English source copy first — never translate against drafts.
2. Use a native translator for the first batch, not machine translation. The page templates are repetitive; the investment is one-time.
3. Service slugs translate too: `fade` → `fade` (en-GB), `degradado` (es-ES), `fade` (pl-PL — common loanword). Validate against local search queries via Semrush.
4. FAQ questions must reflect real local queries — pull from Semrush's "Questions" report in that database, not translated from US FAQ.

## GSC country targeting

For each sub-path:
1. Add the property in GSC: `https://barberhub-tv.lovable.app/uk/`.
2. International Targeting → Country → United Kingdom.
3. Submit the locale's sitemap (`/uk/sitemap.xml` or a sub-path filter in the main sitemap).

## What stays global

- BB economy (single ledger).
- Auth (one user can travel across locales).
- Booking flow (locale only changes copy, not contract).
- Sovereign HQ, admin, payment flows.

Translation only applies to public-facing SEO surfaces. Don't fragment the app.
