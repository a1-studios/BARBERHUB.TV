

## Split Sponsor Ads into Two Slides: Image-Only + Slogan-Only

### What changes

#### 1. `ArenaTicker.tsx` — Update `DisplaySlide` type (lines 29-31)
Add two new slide types: `sponsor-image` (logo only) and `sponsor-text` (name + message + sponsored badge).

```ts
type DisplaySlide =
  | { type: 'prize-pool'; id: string }
  | { type: 'sponsor-image'; id: string; logoUrl?: string; name: string; link?: string }
  | { type: 'sponsor-text'; id: string; name: string; message: string; link?: string };
```

#### 2. `ArenaTicker.tsx` — Update `displaySlides` builder (lines 78-85)
Each sponsor now produces 3 slides: prize-pool → sponsor-image → sponsor-text.

```ts
sponsors.flatMap((sponsor) => [
  { type: 'prize-pool', id: `prize-${sponsor.id}` },
  { type: 'sponsor-image', id: `img-${sponsor.id}`, logoUrl: sponsor.logoUrl, name: sponsor.name, link: sponsor.link },
  { type: 'sponsor-text', id: `txt-${sponsor.id}`, name: sponsor.name, message: sponsor.message, link: sponsor.link },
])
```

#### 3. `ArenaTicker.tsx` — Update render section (lines 180-207)
Replace the single `sponsor` block with two blocks:

- **`sponsor-image`**: Shows only the logo/image, larger (`h-20 sm:h-24`), no text, no sponsored badge
- **`sponsor-text`**: Shows `SponsoredBadge` at the top (reduced ~30% smaller), then brand name bold, then message below

#### 4. `SponsoredBadge.tsx` — Reduce size by 30%
Change font from `text-[8px] sm:text-[10px]` to `text-[6px] sm:text-[7px]`, reduce padding and tracking proportionally.

#### 5. `ArenaTicker.tsx` — Update ScratchReveal variant logic (line 147)
Use `'silver'` variant for both `sponsor-image` and `sponsor-text` types.

