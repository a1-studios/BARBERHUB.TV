# 04 — Social previews

Specs for OG/Twitter cards and the hard limit that constrains us.

## The constraint

`react-helmet-async` mutates `document.head` **client-side**. That works
for Googlebot (executes JS) but **not** for LinkedIn, Slack, Facebook,
iMessage, WhatsApp, or Discord — they only read the static
`index.html` head.

Consequences:
- The sitewide OG card in `index.html` is what every social platform
  will show, for every URL on the site.
- Per-route OG titles/descriptions/images set via Helmet are invisible
  to social crawlers.

If accurate per-page previews become a real revenue driver, the project
needs SSR or static pre-rendering (Vite SSR, Vercel ISR, or a
build-time prerender of city/service pages). That's a separate
decision — don't add SSR speculatively.

## Image specs

- **Dimensions:** 1200 × 630 px (1.91:1).
- **File size:** < 1 MB. < 500 KB preferred.
- **Format:** PNG for type-heavy designs, JPG for photo-heavy.
- **Safe area:** keep critical content in the centered 1000 × 524 box (LinkedIn crops the edges).
- **Brand:** Deep Black background (#0a0a0f), Neon Orange accents, BARBER-HUB wordmark bottom-left.
- **Type contrast:** AA minimum on background.
- **No tiny logos.** Aim for the headline to be readable as a thumbnail at 200px wide.

Current shipped asset: `/og-image.png`.

## When to make a route-specific OG image

Only when one of these is true:
1. The page is paid-acquisition or share-driven (campaign landers).
2. The page has a visual subject that beats the generic card (a featured barber's portrait, a tournament hero).
3. You're A/B testing a hypothesis about CTR.

For everything else, the generic card is fine. Don't fragment the asset library on speculation.

## Twitter specifics

- `twitter:card` = `summary_large_image` ✅
- Twitter falls back to OG tags when `twitter:*` are absent, but we set both for safety.
- Twitter (X) executes minimal JS — same constraint as the others.

## Validation tools

| Platform | Validator |
| --- | --- |
| Facebook / Instagram | https://developers.facebook.com/tools/debug/ |
| LinkedIn | https://www.linkedin.com/post-inspector/ |
| Twitter / X | https://cards-dev.twitter.com/validator (deprecated; use a draft post) |
| iMessage / Slack | Paste into the app, view live |

Re-scrape after every OG change so the platform's cache updates.

## Checklist before changing the static OG

- [ ] New image is 1200×630, < 1 MB.
- [ ] AA contrast on text.
- [ ] Readable at thumbnail size (200px wide).
- [ ] Tested in all four validators.
- [ ] `og:image:width` and `og:image:height` still match.
