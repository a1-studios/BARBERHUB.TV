// Top US metros for "barber near me" SEO landing pages.
// Slugs match URL patterns: /book-barber/:city and /book-barber/:city/:service
export interface SeoCity {
  slug: string;
  name: string;
  state: string;
  population: number; // metro pop, used to prioritize sitemap
}

export const SEO_CITIES: SeoCity[] = [
  { slug: 'new-york', name: 'New York', state: 'NY', population: 8400000 },
  { slug: 'los-angeles', name: 'Los Angeles', state: 'CA', population: 3900000 },
  { slug: 'chicago', name: 'Chicago', state: 'IL', population: 2700000 },
  { slug: 'houston', name: 'Houston', state: 'TX', population: 2300000 },
  { slug: 'phoenix', name: 'Phoenix', state: 'AZ', population: 1700000 },
  { slug: 'philadelphia', name: 'Philadelphia', state: 'PA', population: 1600000 },
  { slug: 'san-antonio', name: 'San Antonio', state: 'TX', population: 1500000 },
  { slug: 'san-diego', name: 'San Diego', state: 'CA', population: 1400000 },
  { slug: 'dallas', name: 'Dallas', state: 'TX', population: 1300000 },
  { slug: 'austin', name: 'Austin', state: 'TX', population: 970000 },
  { slug: 'jacksonville', name: 'Jacksonville', state: 'FL', population: 950000 },
  { slug: 'fort-worth', name: 'Fort Worth', state: 'TX', population: 940000 },
  { slug: 'columbus', name: 'Columbus', state: 'OH', population: 905000 },
  { slug: 'charlotte', name: 'Charlotte', state: 'NC', population: 880000 },
  { slug: 'indianapolis', name: 'Indianapolis', state: 'IN', population: 870000 },
  { slug: 'san-francisco', name: 'San Francisco', state: 'CA', population: 815000 },
  { slug: 'seattle', name: 'Seattle', state: 'WA', population: 750000 },
  { slug: 'denver', name: 'Denver', state: 'CO', population: 715000 },
  { slug: 'washington-dc', name: 'Washington', state: 'DC', population: 700000 },
  { slug: 'boston', name: 'Boston', state: 'MA', population: 690000 },
  { slug: 'nashville', name: 'Nashville', state: 'TN', population: 690000 },
  { slug: 'las-vegas', name: 'Las Vegas', state: 'NV', population: 660000 },
  { slug: 'detroit', name: 'Detroit', state: 'MI', population: 630000 },
  { slug: 'atlanta', name: 'Atlanta', state: 'GA', population: 500000 },
  { slug: 'miami', name: 'Miami', state: 'FL', population: 470000 },
];

export interface SeoService {
  slug: string;
  name: string;
  // Primary keyword for the page title
  keyword: string;
  description: string;
  durationMin: number;
  priceFromUsd: number;
}

export const SEO_SERVICES: SeoService[] = [
  {
    slug: 'haircut',
    name: 'Haircut',
    keyword: 'mens haircut',
    description: 'Classic and modern haircuts tailored to your face shape and lifestyle.',
    durationMin: 30,
    priceFromUsd: 25,
  },
  {
    slug: 'fade',
    name: 'Fade',
    keyword: 'fade haircut',
    description: 'Skin, low, mid, and high fades sharpened by master barbers.',
    durationMin: 35,
    priceFromUsd: 30,
  },
  {
    slug: 'beard-trim',
    name: 'Beard Trim',
    keyword: 'beard trim',
    description: 'Precision beard shaping, line-ups, and hot-towel finish.',
    durationMin: 20,
    priceFromUsd: 18,
  },
  {
    slug: 'hot-towel-shave',
    name: 'Hot Towel Shave',
    keyword: 'hot towel shave',
    description: 'Traditional straight-razor shave with hot towel and aftercare.',
    durationMin: 30,
    priceFromUsd: 35,
  },
  {
    slug: 'kids-haircut',
    name: 'Kids Haircut',
    keyword: 'kids haircut',
    description: 'Patient, friendly cuts for kids of every age and energy level.',
    durationMin: 25,
    priceFromUsd: 20,
  },
  {
    slug: 'lineup',
    name: 'Line-Up',
    keyword: 'edge up haircut',
    description: 'Crisp edge-ups and line-ups between full cuts.',
    durationMin: 15,
    priceFromUsd: 15,
  },
];

export const findCity = (slug?: string) =>
  SEO_CITIES.find((c) => c.slug === slug?.toLowerCase());
export const findService = (slug?: string) =>
  SEO_SERVICES.find((s) => s.slug === slug?.toLowerCase());
