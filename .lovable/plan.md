## Goal

Add the three missing sitewide head tags to `index.html` so crawlers and social platforms have a complete, valid baseline.

## Changes to `index.html` (head only)

Insert directly after the existing `<link rel="manifest">` block:

```html
<link rel="canonical" href="https://barberhub-tv.lovable.app/" />
<meta name="theme-color" content="#0a0a0f" />
```

Add inside the existing OG group (next to `og:title` / `og:description`):

```html
<meta property="og:url" content="https://barberhub-tv.lovable.app/" />
```

## Notes

- `canonical` uses the canonical production domain per project rules. Per-route Helmet canonicals aren't in use yet, so a single sitewide canonical is safe and won't cause duplicates.
- `theme-color` matches Deep Black brand (`#0a0a0f`) for the mobile address bar.
- `og:url` completes the OG block — social crawlers (LinkedIn/Slack/FB) read this since they don't execute JS.
- No code, routing, or component changes. No new dependencies.

## Verify

1. View source on `https://barberhub-tv.lovable.app/` after deploy and confirm the three tags are present.
2. Run https://www.linkedin.com/post-inspector/ and Facebook Sharing Debugger to confirm OG card resolves.
3. On mobile, confirm the browser chrome picks up the dark `theme-color`.
