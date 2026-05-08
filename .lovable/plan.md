## Update site metadata, favicon, and Open Graph image

### 1. Favicon assets → `public/`
Copy from uploaded `favicon.zip` (the Barber Hub pole):
- `favicon.ico` (replaces existing)
- `favicon.svg`
- `favicon-96x96.png`
- `apple-touch-icon.png`
- `web-app-manifest-192x192.png`
- `web-app-manifest-512x512.png`
- `site.webmanifest`

Delete the existing `public/favicon.ico` first so the new one takes effect.

### 2. Open Graph / social image → `public/og-image.png`
Copy the uploaded `Untitled_design_3.png` (the BarberHubTV global competition arena render) to `public/og-image.png`. This is what appears when the site is shared on Facebook, X, iMessage, WhatsApp, LinkedIn, etc.

### 3. Update `index.html` `<head>`
- **Title**: `BARBER-HUB | Global Competitions, Scheduling, Currency, Country & Community Representation Ecosystem`
- **Meta description**: `The ultimate streaming platform & FIFA-style tournament for head-to-head barber battles. Join the global community and earn Barber Bucks.`
- **Favicon links**: add `.ico`, `.svg`, 96×96 PNG, apple-touch-icon, and `<link rel="manifest" href="/site.webmanifest">`
- **Open Graph**: update `og:title`, `og:description`, set `og:image` → `/og-image.png`, add `og:image:width=1200`, `og:image:height=630`, `og:url`, `og:site_name`
- **Twitter**: update `twitter:title`, `twitter:description`, `twitter:image` → `/og-image.png`, keep `summary_large_image`

### Files changed
- `public/favicon.ico` (replaced) + 6 new favicon/manifest files
- `public/og-image.png` (new — uploaded social render)
- `index.html` (title, description, favicon links, OG/Twitter tags)
