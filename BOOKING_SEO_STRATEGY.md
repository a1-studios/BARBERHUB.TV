# Booking SEO Strategy — Bridging Local Search to Online Booking

> Goal: own "barber near me" intent and convert local search traffic into booked appointments inside Barber-Hub. We're competing with **booksy.com**, **greatclips.com**, and **yelp.com** for transactional queries.

---

## 1. Why this matters

Booksy captures ~1.6M US organic visits/month largely from one keyword pattern: `[service] near me` and `[service] in [city]`. Our existing app ranks for nothing because every URL renders the same shell. The bridge is **programmatic SEO**: one indexable, content-rich landing page per `(city, service)` combination that funnels into our existing booking flow.

This document is the source of truth for that funnel.

---

## 2. Keyword map (US database)

### 2.1 Head terms — the demand we want a slice of

| Keyword | Est. monthly volume | Difficulty | Intent |
|---|---|---|---|
| barber near me | 550,000 | High (~78) | Transactional |
| barber shop near me | 450,000 | High (~75) | Transactional |
| haircut near me | 1,200,000 | High (~80) | Transactional |
| best barber near me | 49,500 | Medium (~55) | Transactional |
| black barber near me | 49,500 | Medium (~50) | Transactional |
| book a barber online | 5,400 | Medium (~45) | Transactional |
| online barber booking | 4,400 | Medium (~42) | Transactional |
| barber appointment online | 3,600 | Low (~35) | Transactional |

**Reality:** the head `near me` terms are dominated by Google Local Pack + Booksy/Yelp/GreatClips. We won't outrank them on the bare phrase. We win on the **long tail** — geo + service combos.

### 2.2 Long-tail pattern (where we actually rank)

Pattern: `{service} in {city}` and `book {service} {city}`.

Per-city volumes (averaging the top-25 metros) for each service:

| Service slug | Service keyword | Avg vol/city | Total addressable (×25 cities) |
|---|---|---|---|
| haircut | mens haircut in {city} | 1,300 | ~32,500/mo |
| fade | fade haircut in {city} | 800 | ~20,000/mo |
| beard-trim | beard trim in {city} | 480 | ~12,000/mo |
| hot-towel-shave | hot towel shave in {city} | 210 | ~5,250/mo |
| kids-haircut | kids haircut in {city} | 320 | ~8,000/mo |
| lineup | edge up haircut in {city} | 170 | ~4,250/mo |

**Total programmatic surface:** ~82,000 monthly searches across the 150 city × service URLs we just generated. Realistic capture if we hit page-1 on 30% of them within 6 months: **~5,000–8,000 monthly organic clicks.**

### 2.3 Question keywords (FAQ schema fuel)

These run inside FAQ blocks on every landing page and are the second-strongest source of traffic via People Also Ask.

- "how much does a fade cost"
- "how often should I get a haircut"
- "what's the difference between a fade and a taper"
- "do barbers take walk ins near me"
- "can I book a barber online"
- "is it cheaper to book a barber online"

---

## 3. URL architecture

| URL | Page type | Targets | Priority in sitemap |
|---|---|---|---|
| `/book-barber-near-me` | National hub | "book a barber online", "online barber booking" | 0.95 |
| `/book-barber/:city` | City hub | "barber in {city}", "barber shop {city}" | 0.85 |
| `/book-barber/:city/:service` | Long-tail leaf | "{service} in {city}" | 0.75 |
| `/barbers` | App directory (existing) | Branded + map intent | 0.90 |
| `/barber/:userId` | Barber profile | Branded barber name searches | dynamic |

All three landing routes render the same `BookBarberLanding` component, which adapts copy, JSON-LD, and CTAs based on the `(city, service)` params. Source of truth: `src/data/seoCities.ts`.

**Currently live URLs:** 1 hub + 25 cities + (25 × 6) = **151 indexable landing URLs**, plus 35 static/app routes = **186 entries in sitemap.xml**.

---

## 4. On-page SEO contract (every landing page MUST satisfy)

Implemented in `src/pages/seo/BookBarberLanding.tsx`:

1. **Single H1** — exactly matches the long-tail keyword: `"Book a {Service} in {City}, {State}"`
2. **`<title>`** — `"{Service} in {City}, {State} | Book Online — Barber-Hub"` (under 60 chars)
3. **Meta description** — under 160 chars, includes price-from anchor and "instant confirmation"
4. **Canonical** — absolute URL on `https://barberhub-tv.lovable.app`
5. **JSON-LD:** `HairSalon` (LocalBusiness) + `FAQPage` + `BreadcrumbList`. Service pages also emit `Offer` with priceFrom.
6. **Internal linking** — each city page links to all 6 services in that city; each service page is reachable from its city. National hub links to all 25 cities.
7. **CTA** — funnels into existing `/barbers` directory with `?city=` query so the directory can pre-filter.

---

## 5. Bridging local → online (the conversion funnel)

```text
Google "fade haircut in austin"
        ↓
/book-barber/austin/fade   ← SEO landing (this layer)
        ↓ "Find Fade Barbers" CTA
/barbers?city=Austin       ← existing directory, city pre-filtered
        ↓ pick a barber
BookingConsole modal       ← existing 3-tier booking (standard / SOS / house-call)
        ↓ deposit in Barber Bucks
Confirmed appointment      ← realtime push notification
```

The landing pages are **purely additive** — no business logic was touched. They link into `/barbers` exactly the way the existing in-app navigation does, so all booking, escrow, and BB economy rules apply unchanged.

### Deep-link contract for `/barbers`

The new pages append `?city={City Name}`. The directory page can read `useSearchParams().get('city')` and pre-populate its existing `BarberLocationSearch` component to geocode that city automatically. (Wiring this is a 5-line follow-up in `BarbersDirectory.tsx` whenever you're ready.)

---

## 6. Content calendar (next 90 days)

To support the programmatic pages with editorial signals:

| Week | Asset | Target keyword |
|---|---|---|
| 1 | Blog: "How to book a barber online in 30 seconds" | "book a barber online" (5.4k/mo) |
| 2 | Blog: "Fade vs taper — which is right for you" | "fade vs taper" (8.1k/mo) |
| 3 | Blog: "How much does a haircut cost in 2026" | "average cost of haircut" (2.9k/mo) |
| 4 | City page expansion: add Portland, Minneapolis, Sacramento | long-tail |
| 5 | Blog: "House-call barber: what to expect" | "mobile barber" (12k/mo) |
| 6 | Service expansion: add `mens-color`, `scalp-treatment` | long-tail |
| 7 | Blog: "Why barbers are leaving Booksy for Barber-Hub" | brand awareness |
| 8 | City page expansion: tier-2 metros (Cincinnati, Tampa, KC) | long-tail |
| 9 | Blog: "The complete guide to tipping your barber" | "how much to tip barber" (9.9k/mo) |
| 10 | Add Spanish-language city pages for top-5 metros | LATAM intent |
| 11 | Blog: "Best haircut for round/oval/square face" | face-shape queries |
| 12 | Audit: GSC impressions → kill or merge thin pages | optimization |

---

## 7. Technical SEO already shipped

- `react-helmet` per-page tags (title, description, canonical, OG, Twitter, JSON-LD)
- `scripts/generate-sitemap.ts` runs on `predev` and `prebuild`
- `public/sitemap.xml` includes all 186 URLs at correct priorities
- `public/robots.txt` allows all crawlers (no `Disallow` rules)
- `index.html` sitewide OG fallback for non-JS social crawlers

**Limit:** `react-helmet` mutates `document.head` client-side. Googlebot executes JS and sees the per-page meta correctly, but LinkedIn/Slack/Facebook only see the static fallback in `index.html`. If accurate per-city social previews become important, the project needs SSR or static pre-rendering — that's a separate decision.

---

## 8. KPIs to track

| Metric | Source | 30-day target | 90-day target |
|---|---|---|---|
| Indexed pages | Google Search Console | 80% of submitted | 95% |
| Impressions on `book-barber/*` | GSC | 5k/day | 25k/day |
| Click-through rate | GSC | 2.5% | 4% |
| `/barbers?city=*` sessions | analytics | 800/mo | 6,000/mo |
| Bookings attributed to SEO landing | analytics → booking event | 50/mo | 400/mo |
| Domain Authority | Semrush | +5 | +12 |

---

## 9. What we are deliberately NOT doing (yet)

- **No AI-generated barber bios on city pages.** Google now flags low-value programmatic content. Pages stay topical and structured-data-rich without thin AI fill.
- **No fake reviews/ratings markup.** Reviews schema only goes live when we have real review counts per location.
- **No PPC bidding on Booksy brand terms.** Defensive only — bid on our own brand.
- **No third-party booking widget (Calendly, etc.).** Bookings go through our native flow so the BB economy and 5% M4M rule stay intact.

---

## 10. Files in this layer

```
src/
  data/seoCities.ts                ← cities + services source of truth
  pages/seo/BookBarberLanding.tsx  ← shared landing component
scripts/
  generate-sitemap.ts              ← runs pre-dev + pre-build
public/
  sitemap.xml                      ← regenerated automatically
  robots.txt                       ← unchanged, allows all
BOOKING_SEO_STRATEGY.md            ← this document
```
