import type { Listing, SearchQuerySchema, SimilarListing } from "./listing";

export type AISessionStatus = "pending" | "processing" | "complete" | "failed";

export interface AIFilterInterpretation {
  summary_pl?: string;
  travel_mode: string | null;
  location: string | null;
  near_mountains: boolean;
  near_lake: boolean;
  near_forest: boolean;
  sauna: boolean;
  max_price: number | null;
  min_guests: number | null;
  max_guests: number | null;
  quiet_score_min: number | null;
  custom_tags: string[];
}

export interface AIResult {
  listing_id: string;
  id?: string;
  slug: string;
  title: string;
  short_description?: string;
  location: { city: string; region: string };
  cover_image?: string | null;
  base_price: number;
  currency: string;
  max_guests?: number;
  booking_mode?: "instant" | "request" | string;
  distance_km?: number | null;
  average_rating: number | null;
  review_count: number;
  images: { display_url: string; is_cover: boolean }[];
  listing_type: { name: string; icon: string };
  match_score: number;
  match_reasons: string[];
}

export interface AIMessage {
  role: "user" | "assistant";
  text: string;
  created_at: string;
}

export interface AISession {
  session_id: string;
  status: AISessionStatus;
  prompt: string;
  filters: AIFilterInterpretation | null;
  search_params?: Record<string, unknown> | null;
  results: AIResult[];
  latest_response?: string;
  messages?: AIMessage[];
  assistant_reply?: string;
  follow_up_suggestions?: string[];
  conversation?: AIMessage[];
  error_message?: string | null;
  matching_strategy?: string | null;
  tokens_used: number;
  cost_usd: number;
  model_used?: string | null;
  created_at: string;
  expires_at: string;
}

export interface WishlistItem {
  id: string;
  listing: Listing;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query_payload: SearchQuerySchema;
  notify_new_listings: boolean;
  new_listings_count: number;
  created_at: string;
}

export interface CompareSession {
  session_id: string;
  listings: Listing[];
  expires_at: string;
  created_at: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  mode?: string;
  listings: SimilarListing[];
}

export interface LastMinuteListing extends SimilarListing {
  available_from: string;
  discount_percent?: number;
}

export interface DiscoveryHomepage {
  featured_collections: Collection[];
  last_minute: LastMinuteListing[];
}
