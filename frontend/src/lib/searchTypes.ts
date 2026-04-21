import type { Amenity } from "@/types/listing";

export type SearchListing = {
  id: string;
  title: string;
  slug: string;
  base_price: string;
  currency: string;
  status: string;
  max_guests: number;
  booking_mode: string;
  location: {
    lat: number;
    lng: number;
    city: string;
    region: string;
    country: string;
  } | null;
  cover_image: string | null;
  created_at: string;
  distance_km?: number | null;
  average_rating?: number | string | null;
  review_count?: number;
  listing_type?: { name?: string; icon?: string; slug?: string } | null;
  amenities?: Amenity[];
  /** Cache dopasowania do trybu podróży (jak w karcie listingu). */
  destination_score_cache?: Record<string, number> | null;
};

export type SearchListResponse = {
  data: SearchListing[];
  meta: { next: string | null; previous: string | null; count: number };
};

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  price: string;
  slug?: string;
  title?: string;
  city?: string;
  average_rating?: number | null;
  listing_type?: { name?: string; icon?: string; slug?: string };
  /** Opcjonalnie doklejane ze strony listy (nie z API map) */
  cover_image?: string | null;
};

export const TRAVEL_MODES: { value: string; label: string }[] = [
  { value: "", label: "Dowolny" },
  { value: "romantic", label: "Romantyczny" },
  { value: "family", label: "Rodzinny" },
  { value: "pet", label: "Z pupilem" },
  { value: "workation", label: "Workation" },
  { value: "slow", label: "Slow" },
  { value: "outdoor", label: "Outdoor" },
  { value: "lake", label: "Jeziora" },
  { value: "mountains", label: "Góry" },
  { value: "wellness", label: "Wellness" },
];
