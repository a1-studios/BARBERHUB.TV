export const CHAIR_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'backwash', label: 'Backwash' },
  { id: 'storage', label: 'Storage / Locker' },
  { id: 'parking', label: 'Parking' },
  { id: 'tools', label: 'Tools Provided' },
  { id: 'reception', label: 'Reception' },
  { id: 'ac', label: 'A/C' },
  { id: 'music', label: 'Sound System' },
] as const;

export type ChairAmenityId = typeof CHAIR_AMENITIES[number]['id'];

export interface ChairListing {
  id: string;
  owner_user_id: string;
  shop_name: string | null;
  chair_name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  daily_rate_bb: number;
  weekly_rate_bb: number | null;
  amenities: string[];
  photo_urls: string[];
  distance_miles?: number;
}

export interface ChairBooking {
  id: string;
  listing_id: string;
  renter_user_id: string;
  owner_user_id: string;
  start_date: string;
  end_date: string;
  total_bb: number;
  platform_fee_bb: number;
  status: string;
  created_at: string;
}

export interface ChairFilters {
  startDate: string | null;
  endDate: string | null;
  amenities: ChairAmenityId[];
  radiusMiles: number;
}
