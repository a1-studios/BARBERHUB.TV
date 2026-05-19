# 06 — Content operations

How we plan, ship, and retire SEO content. Pairs with the booking
funnel strategy in `BOOKING_SEO_STRATEGY.md` §6.

## The two content surfaces

1. **Programmatic** — city × service landing pages, generated from `src/data/seoCities.ts`. High volume, low per-page editorial effort.
2. **Editorial** — blog posts and guides that build topical authority and earn links. Low volume, high per-page effort.

Both feed the same funnel: search → landing → `/barbers` → booking.

## Programmatic content

### Adding a new city

1. Add the city to `src/data/seoCities.ts` with: `slug`, `name`, `state`, `stateAbbr`, `country`, `population`, `priceFloor`, `priceCeil`, `topNeighborhoods` (3–5).
2. Re-run dev/build — sitemap regenerates automatically.
3. QA: open `/book-barber/{slug}` and each of the 6 service variants. Verify title, H1, FAQ, schema (Rich Results Test).
4. Add the city to GSC's URL Inspection queue (optional — Google will find it via sitemap within 1–2 weeks).

### Adding a new service slug

1. Add to `src/data/seoCities.ts` services array with: `slug`, `name`, `priceFromMultiplier`, `keyword`, `description`.
2. Regenerates 25 new pages (one per existing city) automatically.
3. Spot-check 3 random city × service combos before merging.

### Internal linking rules

- National hub `/book-barber-near-me` links to all 25 city hubs.
- Each city hub links to all 6 services in that city.
- Each service page links back to its city hub and across to its sister services.
- Every landing page CTA points at `/barbers?city={City}` so the directory pre-filters.
- Never link from a city page to an unrelated city — keeps topical clusters tight.

### QA checklist before publishing a programmatic batch

- [ ] All new URLs return 200, no redirects.
- [ ] Each has unique `<title>` and `<meta description>`.
- [ ] One H1, matches the long-tail keyword.
- [ ] Canonical = the page's own URL (not the parent city).
- [ ] FAQ has ≥ 4 questions, all distinct from other pages.
- [ ] HairSalon JSON-LD validates (Rich Results Test).
- [ ] Sitemap regenerated and includes the new URLs.
- [ ] Internal-link grid renders correctly on mobile.

## Editorial content

### Brief template

```
Title (proposed):
Target keyword + monthly volume + difficulty:
Search intent (informational / transactional / comparison):
Primary CTA:
Internal links out (3+):
Internal links in (where will we link to this from?):
Outline (H2s):
Word count target:
Schema to emit (Article + ?):
```

### 12-week calendar (rolling)

See `BOOKING_SEO_STRATEGY.md` §6. Treat it as the working backlog —
review monthly, swap topics based on GSC + Semrush signals.

### Publishing checklist

- [ ] Brief approved.
- [ ] Title < 60 chars, includes target keyword.
- [ ] Meta description < 160 chars, includes CTA verb.
- [ ] One H1.
- [ ] 3+ internal links out to programmatic or product pages.
- [ ] Article JSON-LD with author, datePublished, dateModified.
- [ ] OG image (per [04](./04-social-previews.md)) if shareable.
- [ ] Added to sitemap.

## Retirement / pruning

Run quarterly:

1. GSC report: pages with 0 clicks in 90 days.
2. For each: improve, merge into a stronger page, or `410 Gone`.
3. Update sitemap after pruning so removed URLs are dropped.

Thin programmatic pages hurt more than they help — Google has been flagging low-value programmatic content since 2023.

## What we deliberately don't do

- No AI-generated barber bios on city pages.
- No fake reviews/ratings.
- No PPC bidding on competitor brand terms.
- No third-party booking widget — bookings stay in the native flow so the BB economy stays intact.
