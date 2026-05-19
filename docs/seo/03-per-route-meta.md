# 03 — Per-route meta contract

Every public route in `src/App.tsx` and what its head MUST contain.
Routes not listed here are utility/internal and inherit the static
`index.html` head (or should be `noindex`).

Legend:
- **Static** = inherits `index.html` head, no Helmet needed.
- **Helmet** = component must set its own head via `react-helmet-async`.
- ✅ = currently implemented · ❌ = follow-up ticket

| Route | Source | Strategy | Title pattern | JSON-LD |
| --- | --- | --- | --- | --- |
| `/` | `pages/Index.tsx` | Static + sitewide JSON-LD | Brand title | Organization, WebSite ❌ |
| `/watch` | `pages/WatchFeed.tsx` | Helmet ❌ | `Watch barber battles — Barber-Hub` | VideoObject (per active item) |
| `/tournaments` | `pages/Tournaments.tsx` | Helmet ❌ | `Tournaments — Barber-Hub` | none |
| `/tournaments/:id` | `pages/TournamentDetails.tsx` | Helmet ❌ | `{Tournament name} — Barber-Hub` | Event |
| `/barbers` | `pages/BarbersDirectory.tsx` | Helmet ❌ | `Find a barber near you — Barber-Hub` | none (directory) |
| `/barber/:userId` | `pages/BarberPublicProfile.tsx` | Helmet ❌ | `{Display name} — Barber on Barber-Hub` | HairSalon + Review (only if real) + VideoObject |
| `/book-barber-near-me` | `pages/seo/BookBarberLanding.tsx` | Helmet ✅ | `Book a barber online — Barber-Hub` | FAQPage, BreadcrumbList |
| `/book-barber/:city` | same | Helmet ✅ | `Barbers in {City}, {State} — Barber-Hub` | HairSalon, FAQPage, BreadcrumbList |
| `/book-barber/:city/:service` | same | Helmet ✅ | `{Service} in {City}, {State} \| Book Online — Barber-Hub` | HairSalon, Offer, FAQPage, BreadcrumbList |
| `/vault` | `pages/VaultOfHonor.tsx` | Helmet ❌ | `Vault of Honor — Barber-Hub` | none |
| `/grants` | `pages/Grants.tsx` | Helmet ❌ | `Barber grants — Barber-Hub` | FAQPage (if FAQ added) |
| `/coming-soon` | `pages/ComingSoon.tsx` | `noindex` ❌ | n/a | n/a |
| `/auth/callback` | utility | `noindex` ❌ | n/a | n/a |
| `/reset-password` | utility | `noindex` ❌ | n/a | n/a |
| `/payment-success` | utility | `noindex` ❌ | n/a | n/a |
| `/payment-canceled` | utility | `noindex` ❌ | n/a | n/a |
| `/m4m/verify/:id` | utility | `noindex` ❌ | n/a | n/a |
| `/broadcast/:id` | live, ephemeral | `noindex` ❌ | n/a | n/a |
| `/terms` `/privacy` `/aup` `/cookies` | legal | Helmet ❌ | `{Doc title} — Barber-Hub` | none |
| `/sovereign-hq`, `/admin/*` | internal | `noindex` + Disallow | n/a | n/a |

## Required tags per Helmet route

Every Helmet route MUST set:

```tsx
<Helmet>
  <title>{exactTitle}</title>
  <meta name="description" content={descUnder160Chars} />
  <link rel="canonical" href={`https://barberhub-tv.lovable.app${path}`} />
  <meta property="og:title" content={exactTitle} />
  <meta property="og:description" content={descUnder160Chars} />
  <meta property="og:url" content={`https://barberhub-tv.lovable.app${path}`} />
  <meta property="og:type" content="website" />
  <meta name="twitter:title" content={exactTitle} />
  <meta name="twitter:description" content={descUnder160Chars} />
  {/* JSON-LD blocks as listed in the table */}
</Helmet>
```

For routes that should not be indexed:

```tsx
<Helmet>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>
```

## Conventions

- **Title length:** target 50–60 chars. Hard cap 70.
- **Description length:** 130–155 chars. Hard cap 160.
- **One H1 per page.** Match the long-tail keyword on programmatic pages.
- **Canonical is always absolute.** Never a relative path.
- **Dynamic routes wait for data.** Don't render Helmet with placeholder titles — render `null` until the data loads, or set `prerender-status-code: 404` for missing rows.
