import type { LocationTagKey } from "@/lib/locationTags";

import type { HostProfile } from "./host";

export type { HostProfile };
export type { LocationTagKey };

export interface ListingImage {
  id: string;
  display_url: string | null;
  url?: string | null;
  is_cover: boolean;
  sort_order: number;
  alt_text: string;
}

type LocationSurroundings = Partial<Record<LocationTagKey, boolean>>;

export interface ListingLocation extends LocationSurroundings {
  country: string;
  region: string;
  city: string;
  address_line: string;
  postal_code: string;
  latitude: number;
  longitude: number;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export interface DestinationScore {
  romantic: number;
  outdoor: number;
  nature: number;
  quiet: number;
  family: number;
  workation: number;
  accessibility: number;
  calculated_at: string;
  version?: number;
}

export interface POIItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  distance_m: number;
  rating: number | null;
  is_open: boolean | null;
  lat: number;
  lng: number;
  osm_id: string;
}

export interface NearbyPlaces {
  restaurant: POIItem[];
  outdoor: POIItem[];
  shop: POIItem[];
  transport: POIItem[];
}

export interface AreaSummary {
  city: string;
  region: string;
  character: string;
  distance_to_center_km: number;
  counts: {
    restaurants: number;
    trails: number;
    ski_lifts: number;
    shops: number;
  };
  tags: string[];
  nature_score: number;
}

export interface PriceCalendarDay {
  date: string;
  price: number | null;
  seasonal_multiplier: number;
  is_holiday: boolean;
  holiday_name: string | null;
  is_booked: boolean;
}

export interface PricingRule {
  type: "seasonal" | "holiday" | "long_stay";
  name: string;
  multiplier?: number;
  discount_percent?: number;
  date_from?: string;
  date_to?: string;
  min_nights?: number;
}

/** Payload zapisu wyszukiwania i filtrów (API saved-searches). */
export interface SearchQuerySchema extends LocationSurroundings {
  location?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  date_from?: string;
  date_to?: string;
  guests?: number;
  adults?: number;
  children?: number;
  pets?: boolean;
  travel_mode?: string;
  min_price?: number;
  max_price?: number;
  listing_types?: string[];
  amenities?: string[];
  is_pet_friendly?: boolean;
  ordering?: string;
  booking_mode?: string;
}

export interface SimilarListing {
  id: string;
  slug: string;
  title: string;
  base_price: number;
  currency: string;
  average_rating: number | null;
  review_count: number;
  distance_km: number;
  listing_type: { name: string; icon: string };
  location: { city: string; region: string };
  /** Zgodne z wyszukiwarką — preferuj to zamiast składać URL z tablicy images. */
  cover_image?: string | null;
  images: { display_url: string; is_cover: boolean }[];
  destination_score_cache: Record<string, number> | null;
  top_badge: string | null;
  /** Dla sekcji last minute — pierwszy wolny termin */
  available_from?: string | null;
}

export interface ExplainableBadge {
  mode: string;
  score: number;
  title: string;
  reason: string;
  is_positive: boolean;
}

export interface FeaturedCollection {
  id: string;
  title: string;
  description: string;
  listings: SimilarListing[];
  mode?: string;
}

export interface DiscoveryHomepageData {
  featured_collections: FeaturedCollection[];
  last_minute: SimilarListing[];
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  listing_type: { name: string; icon: string; slug: string };
  host: HostProfile;
  location: ListingLocation | null;
  images: ListingImage[];
  amenities: Amenity[];
  max_guests: number;
  guests_included: number;
  extra_guest_fee: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  is_pet_friendly: boolean;
  booking_mode: "instant" | "request";
  base_price: number;
  currency: string;
  cleaning_fee: number | null;
  service_fee_percent: number;
  check_in_time: string;
  check_out_time: string;
  cancellation_policy: "flexible" | "moderate" | "strict" | "non_refundable";
  average_rating: number | null;
  review_count: number;
  destination_score_cache: DestinationScore | null;
  /** Krótki opis okolicy (cache backendu, PL) */
  area_summary: string | null;
  status: string;
}

export interface Conversation {
  id: string;
  listing: { id: string; title: string; slug: string };
  guest: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  host: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  last_message: Message | null;
  unread_count: number;
  related_booking: {
    id: string;
    check_in: string;
    check_out: string;
    status: string;
  } | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ReviewWithBlind {
  id: string;
  listing_id: string;
  booking_id: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  overall_rating: number;
  content: string;
  is_public: boolean;
  is_blind_review_released: boolean;
  blind_release_at: string;
  host_response: string | null;
  host_response_at: string | null;
  created_at: string;
  cleanliness_rating?: number;
  location_rating?: number;
  communication_rating?: number;
  accuracy_rating?: number;
}
