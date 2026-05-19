# 05 — Analytics & KPIs

How we measure SEO and the weekly ritual that keeps the funnel honest.

## Data sources

| Source | What it tells you | Latency |
| --- | --- | --- |
| Google Search Console | Impressions, clicks, position, queries, indexing status | 1–2 days |
| Semrush | Estimated rank, KD, competitor moves, backlinks | weekly |
| GA4 (`gtag`) | Sessions, conversions, attribution | realtime |
| Meta Pixel | Audience building, ad attribution | realtime |
| First-party `seo_events` (Supabase) | Funnel events with session + user join | realtime |

GA4/Pixel are gated by cookie consent (`src/lib/consent.ts`). `seo_events` is first-party and always fires.

## `seo_events` catalogue

Logged by `trackSeoEvent()` in `src/lib/seoAnalytics.ts`. Schema: `event_name`, `path`, `city_slug`, `service_slug`, `referrer`, `user_id`, `session_id`, `props`.

| `event_name` | Fired when | Required props |
| --- | --- | --- |
| `seo_landing_view` | User lands on `/book-barber*` | `city_slug`, `service_slug` |
| `seo_landing_cta_click` | "Find barbers" CTA tapped | `city_slug`, `service_slug` |
| `seo_directory_arrival` | `/barbers` opened with `?city=` from SEO | `city_slug` |
| `seo_barber_selected` | Barber card opened from a SEO-attributed session | `barber_id` |
| `seo_booking_started` | BookingConsole opened from SEO-attributed session | `barber_id` |
| `seo_booking_confirmed` | Booking confirmed | `booking_id`, `amount_bb` |

When adding a new event: name it `seo_<noun>_<verb>`, include `city_slug`/`service_slug` whenever the source is a programmatic page, and update this table.

## GA4 / Ads mapping

Mirror every `seo_*` event into GA4 with `gtag('event', name, props)` — `trackSeoEvent` already does this. In GA4 Admin:

1. Mark `seo_booking_confirmed` as a **Key event** (conversion).
2. Import the conversion into Google Ads for bidding.
3. Build an Exploration: dimensions = `page_path`, `city_slug`; metrics = users, conversions, conversion rate.

## Dashboards to build

1. **SEO funnel** — landing views → CTA → directory → booking, broken down by city and service. Source: `seo_events`. Build in Supabase (SQL view + chart) or Looker Studio.
2. **GSC weekly** — top 20 queries gaining/losing position; top 20 pages by clicks. Connect GSC to Looker Studio (free).
3. **Indexation health** — submitted vs indexed from GSC's coverage report. Alert if indexed drops > 5% week-over-week.
4. **CWV trend** — LCP/INP/CLS on `/`, `/barbers`, `/book-barber/:city`, `/book-barber/:city/:service`, `/barber/:userId`. PageSpeed Insights API → Supabase table.

## Weekly review ritual (15 min, Mondays)

1. GSC: total clicks and impressions vs last week. Note any –10% page-level drops.
2. Funnel dashboard: landing → booking conversion rate. Investigate if < 0.5%.
3. CWV: any metric breaching budget on any tracked page → file ticket.
4. Top 10 winning queries: any that warrant a new dedicated page? → backlog.
5. Top 10 losing queries: any that need refreshed copy? → content ops.

## KPI targets

Promoted from `BOOKING_SEO_STRATEGY.md` §8 as the canonical scoreboard:

| Metric | Source | 30-day | 90-day |
| --- | --- | --- | --- |
| Indexed pages | GSC | 80% of submitted | 95% |
| Impressions on `/book-barber/*` | GSC | 5k/day | 25k/day |
| CTR | GSC | 2.5% | 4% |
| `/barbers?city=*` sessions | GA4 + `seo_events` | 800/mo | 6,000/mo |
| SEO-attributed bookings | `seo_events` | 50/mo | 400/mo |
| Domain Authority | Semrush | +5 | +12 |

## Cookie consent rules

- `gtag` and `fbq` only load after the user grants marketing consent.
- `seo_events` is first-party, no consent gate.
- Don't add new third-party tags without routing them through `src/lib/consent.ts`.
