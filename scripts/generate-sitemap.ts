// Generates public/sitemap.xml from static routes + SEO landing pages.
// Runs via `predev` and `prebuild` so dev preview and prod stay in sync.
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { SEO_CITIES, SEO_SERVICES } from '../src/data/seoCities';

const BASE_URL = 'https://barberhub-tv.lovable.app';

interface Entry {
  path: string;
  changefreq?: 'weekly' | 'monthly' | 'daily';
  priority?: string;
}

const staticEntries: Entry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/barbers', changefreq: 'daily', priority: '0.9' },
  { path: '/watch', changefreq: 'daily', priority: '0.8' },
  { path: '/tournaments', changefreq: 'weekly', priority: '0.7' },
  { path: '/vault', changefreq: 'weekly', priority: '0.6' },
  { path: '/grants', changefreq: 'monthly', priority: '0.5' },
  { path: '/book-barber-near-me', changefreq: 'weekly', priority: '0.95' },
  { path: '/terms', changefreq: 'monthly', priority: '0.2' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.2' },
  { path: '/aup', changefreq: 'monthly', priority: '0.2' },
  { path: '/cookies', changefreq: 'monthly', priority: '0.2' },
];

const cityEntries: Entry[] = SEO_CITIES.map((c) => ({
  path: `/book-barber/${c.slug}`,
  changefreq: 'weekly',
  priority: '0.85',
}));

const serviceEntries: Entry[] = SEO_CITIES.flatMap((c) =>
  SEO_SERVICES.map((s) => ({
    path: `/book-barber/${c.slug}/${s.slug}`,
    changefreq: 'weekly' as const,
    priority: '0.75',
  })),
);

const entries = [...staticEntries, ...cityEntries, ...serviceEntries];

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : '',
      e.priority ? `    <priority>${e.priority}</priority>` : '',
      `  </url>`,
    ].filter(Boolean).join('\n'),
  ),
  `</urlset>`,
].join('\n');

writeFileSync(resolve('public/sitemap.xml'), xml);
console.log(`sitemap.xml written (${entries.length} URLs)`);
