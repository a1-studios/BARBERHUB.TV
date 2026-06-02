export interface FeaturedBarberTeaser {
  id: string;
  name: string;
  handle: string;
  city: string;
  country: string;
  flag: string;
  specialty: string;
  tier: "Diamond" | "Gold" | "Silver" | "Bronze";
  initials: string;
}

export const FEATURED_BARBERS_TEASER: FeaturedBarberTeaser[] = [
  {
    id: "feat-1",
    name: "Marcus 'Blade' Reyes",
    handle: "@bladereyes",
    city: "New York",
    country: "US",
    flag: "🇺🇸",
    specialty: "✂️ Skin Fades · Beard Sculpt",
    tier: "Diamond",
    initials: "MR",
  },
  {
    id: "feat-2",
    name: "Kojo Asante",
    handle: "@kojocuts",
    city: "London",
    country: "GB",
    flag: "🇬🇧",
    specialty: "💈 Afro Tapers · Line-ups",
    tier: "Gold",
    initials: "KA",
  },
  {
    id: "feat-3",
    name: "Diego Salazar",
    handle: "@salazarshop",
    city: "Mexico City",
    country: "MX",
    flag: "🇲🇽",
    specialty: "🪒 Hot Towel Shaves · Pompadours",
    tier: "Gold",
    initials: "DS",
  },
];
