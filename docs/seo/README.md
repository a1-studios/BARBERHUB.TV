# SEO Playbook — Barber-Hub

Single source of truth for SEO across the platform. Pair this with
[`BOOKING_SEO_STRATEGY.md`](../../BOOKING_SEO_STRATEGY.md), which
covers the city × service booking funnel in depth.

- **Owner:** Growth (with eng support from the platform team)
- **Last reviewed:** 2026-05
- **Domain:** https://barberhub-tv.lovable.app

## Start here

| If you're… | Read |
| --- | --- |
| Adding a new public route | [03-per-route-meta](./03-per-route-meta.md) |
| Editing `index.html` head | [01-technical-seo](./01-technical-seo.md) |
| Adding structured data | [02-schema-jsonld](./02-schema-jsonld.md) |
| Designing an OG image | [04-social-previews](./04-social-previews.md) |
| Wiring analytics for a new page | [05-analytics-and-kpis](./05-analytics-and-kpis.md) |
| Shipping new city/service pages | [06-content-ops](./06-content-ops.md) + booking strategy |
| Launching a non-US market | [07-international-expansion](./07-international-expansion.md) |
| Rankings just dropped | [08-monitoring-and-incidents](./08-monitoring-and-incidents.md) |

## The full set

1. [Technical SEO](./01-technical-seo.md) — head contract, robots, sitemap, Core Web Vitals.
2. [Schema / JSON-LD](./02-schema-jsonld.md) — every structured-data block we emit.
3. [Per-route meta](./03-per-route-meta.md) — title/description/canonical/OG/JSON-LD per route.
4. [Social previews](./04-social-previews.md) — OG/Twitter specs and the SSR limitation.
5. [Analytics & KPIs](./05-analytics-and-kpis.md) — `seo_events`, GA4, Pixel, dashboards, weekly review.
6. [Content ops](./06-content-ops.md) — editorial calendar, briefs, internal linking, QA.
7. [International expansion](./07-international-expansion.md) — hreflang, locale URLs, market clones.
8. [Monitoring & incidents](./08-monitoring-and-incidents.md) — alerts, runbooks, recovery.

## Related code

```text
index.html                              ← sitewide head
public/robots.txt                       ← crawl directives
public/sitemap.xml                      ← generated, do not hand-edit
scripts/generate-sitemap.ts             ← runs predev + prebuild
src/pages/seo/BookBarberLanding.tsx     ← programmatic landing template
src/data/seoCities.ts                   ← cities + services source of truth
src/components/seo/                     ← reusable SEO components (FAQ, breadcrumbs, links)
src/lib/seoAnalytics.ts                 ← first-party event tracker → seo_events table
```
