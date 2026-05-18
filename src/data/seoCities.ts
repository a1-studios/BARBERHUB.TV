// Top US metros for "barber near me" SEO landing pages.
// Slugs match URL patterns: /book-barber/:city and /book-barber/:city/:service
export interface SeoCity {
  slug: string;
  name: string;
  state: string;
  population: number; // metro pop, used to prioritize sitemap
  tagline: string;
  intro: string;
  neighborhoods: string[];
  avgPriceUsd: number;
  popularServiceSlugs: string[];
}

const DEFAULT_SERVICES = ['haircut', 'fade', 'beard-trim'];

export const SEO_CITIES: SeoCity[] = [
  {
    slug: 'new-york', name: 'New York', state: 'NY', population: 8400000,
    tagline: 'NYC fades, lineups, and traditional shaves — booked in seconds.',
    intro: 'From Brooklyn brownstones to Midtown high-rises, New York barbers set the pace for the country. Book a verified NYC barber online, see live availability, and skip the walk-in line.',
    neighborhoods: ['Williamsburg', 'SoHo', 'Harlem', 'LES', 'Astoria', 'Upper East Side'],
    avgPriceUsd: 45,
    popularServiceSlugs: ['fade', 'haircut', 'beard-trim', 'hot-towel-shave'],
  },
  {
    slug: 'los-angeles', name: 'Los Angeles', state: 'CA', population: 3900000,
    tagline: 'LA-tier cuts, beach to boulevard.',
    intro: 'From Venice to Silver Lake, LA barbers serve everyone from creatives to executives. Book online in 30 seconds with verified shops and clear pricing.',
    neighborhoods: ['Venice', 'Silver Lake', 'Hollywood', 'DTLA', 'Echo Park', 'Santa Monica'],
    avgPriceUsd: 40, popularServiceSlugs: ['fade', 'haircut', 'beard-trim'],
  },
  {
    slug: 'chicago', name: 'Chicago', state: 'IL', population: 2700000,
    tagline: 'Chicago barbers, no phone-tag.',
    intro: 'Chicago has one of the deepest barber benches in the country — from West Loop classics to Wicker Park style. Lock in a slot online instead of waiting on hold.',
    neighborhoods: ['Wicker Park', 'West Loop', 'Lincoln Park', 'Logan Square', 'Bucktown', 'River North'],
    avgPriceUsd: 35, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'houston', name: 'Houston', state: 'TX', population: 2300000,
    tagline: 'Houston cuts, online booking.',
    intro: 'From Montrose to Midtown, Houston barbers cover every style. See live availability and confirm in seconds.',
    neighborhoods: ['Montrose', 'Midtown', 'Heights', 'River Oaks', 'EaDo', 'Downtown'],
    avgPriceUsd: 32, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'phoenix', name: 'Phoenix', state: 'AZ', population: 1700000,
    tagline: 'Valley barbers, instantly booked.',
    intro: 'Phoenix barbers from Arcadia to Roosevelt Row. Book online with verified pricing — no surprises at checkout.',
    neighborhoods: ['Arcadia', 'Roosevelt Row', 'Downtown', 'Scottsdale', 'Tempe', 'North Phoenix'],
    avgPriceUsd: 30, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'philadelphia', name: 'Philadelphia', state: 'PA', population: 1600000,
    tagline: 'Philly barbers, no waiting.',
    intro: 'Center City to Fishtown — Philly barbers serve every neighborhood. Book in 30 seconds.',
    neighborhoods: ['Center City', 'Fishtown', 'Northern Liberties', 'South Philly', 'University City', 'Rittenhouse'],
    avgPriceUsd: 32, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'san-antonio', name: 'San Antonio', state: 'TX', population: 1500000,
    tagline: 'SA fades and lineups, online.',
    intro: 'San Antonio barbers serve from the Pearl to Alamo Heights. Confirm instantly with live availability.',
    neighborhoods: ['The Pearl', 'Alamo Heights', 'Southtown', 'Stone Oak', 'Downtown', 'Olmos Park'],
    avgPriceUsd: 28, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'san-diego', name: 'San Diego', state: 'CA', population: 1400000,
    tagline: 'San Diego barbers, sun to suit.',
    intro: 'From Pacific Beach to Gaslamp, San Diego barbers cover surf to suit. Book online with verified reviews.',
    neighborhoods: ['Pacific Beach', 'Gaslamp', 'North Park', 'La Jolla', 'Hillcrest', 'Little Italy'],
    avgPriceUsd: 38, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'dallas', name: 'Dallas', state: 'TX', population: 1300000,
    tagline: 'Dallas cuts on demand.',
    intro: 'Uptown to Deep Ellum — Dallas barbers serve every style. Real-time booking, real prices.',
    neighborhoods: ['Uptown', 'Deep Ellum', 'Bishop Arts', 'Knox-Henderson', 'Highland Park', 'Oak Cliff'],
    avgPriceUsd: 35, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'austin', name: 'Austin', state: 'TX', population: 970000,
    tagline: 'Austin barbers, no waitlist.',
    intro: 'East Austin to South Congress — keep your cut sharp without losing a Saturday to phone calls.',
    neighborhoods: ['East Austin', 'South Congress', 'Downtown', 'Rainey Street', 'Mueller', 'South Lamar'],
    avgPriceUsd: 35, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'jacksonville', name: 'Jacksonville', state: 'FL', population: 950000,
    tagline: 'Jax barbers, easy booking.',
    intro: 'Jacksonville barbers from Riverside to the Beaches. Verified shops, instant confirmation.',
    neighborhoods: ['Riverside', 'San Marco', 'Jacksonville Beach', 'Downtown', 'Five Points', 'Atlantic Beach'],
    avgPriceUsd: 28, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'fort-worth', name: 'Fort Worth', state: 'TX', population: 940000,
    tagline: 'Fort Worth cuts, booked clean.',
    intro: 'From Sundance Square to the Cultural District. Book a Fort Worth barber in seconds.',
    neighborhoods: ['Sundance Square', 'West 7th', 'Cultural District', 'Stockyards', 'Near Southside', 'TCU'],
    avgPriceUsd: 30, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'columbus', name: 'Columbus', state: 'OH', population: 905000,
    tagline: 'Columbus barbers, online.',
    intro: 'Short North to German Village — Columbus barbers cover every neighborhood with online booking.',
    neighborhoods: ['Short North', 'German Village', 'Clintonville', 'Grandview', 'Downtown', 'Italian Village'],
    avgPriceUsd: 28, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'charlotte', name: 'Charlotte', state: 'NC', population: 880000,
    tagline: 'Queen City cuts.',
    intro: 'Charlotte barbers serve from Uptown to NoDa. Live availability, verified reviews.',
    neighborhoods: ['Uptown', 'NoDa', 'South End', 'Plaza Midwood', 'Dilworth', 'Ballantyne'],
    avgPriceUsd: 30, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'indianapolis', name: 'Indianapolis', state: 'IN', population: 870000,
    tagline: 'Indy barbers, on your time.',
    intro: 'Mass Ave to Fountain Square. Book an Indianapolis barber online in 30 seconds.',
    neighborhoods: ['Mass Ave', 'Fountain Square', 'Broad Ripple', 'Downtown', 'Fletcher Place', 'Carmel'],
    avgPriceUsd: 28, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'san-francisco', name: 'San Francisco', state: 'CA', population: 815000,
    tagline: 'SF barbers, no phone-tag.',
    intro: 'From the Mission to North Beach — SF barbers serve every block. Real-time booking with clear pricing.',
    neighborhoods: ['Mission', 'North Beach', 'Hayes Valley', 'SoMa', 'Castro', 'Marina'],
    avgPriceUsd: 50, popularServiceSlugs: ['fade', 'haircut', 'beard-trim', 'hot-towel-shave'],
  },
  {
    slug: 'seattle', name: 'Seattle', state: 'WA', population: 750000,
    tagline: 'Seattle barbers, booked clean.',
    intro: 'Capitol Hill to Ballard — Seattle barbers ready when you are. Verified shops with online booking.',
    neighborhoods: ['Capitol Hill', 'Ballard', 'Fremont', 'Downtown', 'Queen Anne', 'Wallingford'],
    avgPriceUsd: 42, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'denver', name: 'Denver', state: 'CO', population: 715000,
    tagline: 'Mile High cuts.',
    intro: 'RiNo to LoHi — Denver barbers serve every style. Live availability, instant confirmation.',
    neighborhoods: ['RiNo', 'LoHi', 'Capitol Hill', 'Cherry Creek', 'Highlands', 'Downtown'],
    avgPriceUsd: 35, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'washington-dc', name: 'Washington', state: 'DC', population: 700000,
    tagline: 'DC barbers, online booking.',
    intro: 'From Georgetown to H Street — DC barbers serve every quadrant. Skip the phone call.',
    neighborhoods: ['Georgetown', 'H Street', 'Dupont Circle', 'Adams Morgan', 'Shaw', 'Logan Circle'],
    avgPriceUsd: 40, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'boston', name: 'Boston', state: 'MA', population: 690000,
    tagline: 'Boston cuts, on demand.',
    intro: 'Back Bay to Southie — Boston barbers serve the whole 617. Book online with verified pricing.',
    neighborhoods: ['Back Bay', 'South Boston', 'North End', 'Cambridge', 'Beacon Hill', 'Seaport'],
    avgPriceUsd: 40, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'nashville', name: 'Nashville', state: 'TN', population: 690000,
    tagline: 'Nashville barbers, sharp and easy.',
    intro: 'East Nashville to The Gulch — Nashville barbers booked in seconds.',
    neighborhoods: ['East Nashville', 'The Gulch', '12 South', 'Germantown', 'Downtown', 'Wedgewood-Houston'],
    avgPriceUsd: 32, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'las-vegas', name: 'Las Vegas', state: 'NV', population: 660000,
    tagline: 'Vegas barbers, on the clock.',
    intro: 'Strip to Summerlin — Las Vegas barbers ready 24/7. Book in seconds, walk in confident.',
    neighborhoods: ['The Strip', 'Summerlin', 'Henderson', 'Downtown', 'Spring Valley', 'Centennial'],
    avgPriceUsd: 35, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'detroit', name: 'Detroit', state: 'MI', population: 630000,
    tagline: 'Detroit cuts, online.',
    intro: 'Midtown to Corktown — Detroit barbers cover the city. Live booking with verified shops.',
    neighborhoods: ['Midtown', 'Corktown', 'Downtown', 'Eastern Market', 'New Center', 'West Village'],
    avgPriceUsd: 28, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'atlanta', name: 'Atlanta', state: 'GA', population: 500000,
    tagline: 'ATL barbers, no waitlist.',
    intro: 'Buckhead to Old Fourth Ward — Atlanta barbers serve every neighborhood with online booking.',
    neighborhoods: ['Buckhead', 'Old Fourth Ward', 'Midtown', 'West Midtown', 'Inman Park', 'Virginia-Highland'],
    avgPriceUsd: 35, popularServiceSlugs: DEFAULT_SERVICES,
  },
  {
    slug: 'miami', name: 'Miami', state: 'FL', population: 470000,
    tagline: 'Miami cuts, instantly booked.',
    intro: 'Wynwood to Brickell — Miami barbers ready when you are. Book online with verified reviews.',
    neighborhoods: ['Wynwood', 'Brickell', 'South Beach', 'Coconut Grove', 'Coral Gables', 'Little Havana'],
    avgPriceUsd: 40, popularServiceSlugs: DEFAULT_SERVICES,
  },
];

export interface SeoService {
  slug: string;
  name: string;
  keyword: string;
  description: string;
  durationMin: number;
  priceFromUsd: number;
}

export const SEO_SERVICES: SeoService[] = [
  { slug: 'haircut', name: 'Haircut', keyword: 'mens haircut', description: 'Classic and modern haircuts tailored to your face shape and lifestyle.', durationMin: 30, priceFromUsd: 25 },
  { slug: 'fade', name: 'Fade', keyword: 'fade haircut', description: 'Skin, low, mid, and high fades sharpened by master barbers.', durationMin: 35, priceFromUsd: 30 },
  { slug: 'beard-trim', name: 'Beard Trim', keyword: 'beard trim', description: 'Precision beard shaping, line-ups, and hot-towel finish.', durationMin: 20, priceFromUsd: 18 },
  { slug: 'hot-towel-shave', name: 'Hot Towel Shave', keyword: 'hot towel shave', description: 'Traditional straight-razor shave with hot towel and aftercare.', durationMin: 30, priceFromUsd: 35 },
  { slug: 'kids-haircut', name: 'Kids Haircut', keyword: 'kids haircut', description: 'Patient, friendly cuts for kids of every age and energy level.', durationMin: 25, priceFromUsd: 20 },
  { slug: 'lineup', name: 'Line-Up', keyword: 'edge up haircut', description: 'Crisp edge-ups and line-ups between full cuts.', durationMin: 15, priceFromUsd: 15 },
];

export const findCity = (slug?: string) =>
  SEO_CITIES.find((c) => c.slug === slug?.toLowerCase());
export const findService = (slug?: string) =>
  SEO_SERVICES.find((s) => s.slug === slug?.toLowerCase());
