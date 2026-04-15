import type { Listing } from "./listing";

export interface PricingBreakdown {
  nights: number;
  guests?: number;
  adults?: number;
  children?: number;
  pets?: number;
  guests_included?: number;
  extra_guests?: number;
  extra_guest_fee_per_night?: number;
  extra_guests_total?: number;
  extra_adults?: number;
  adult_surcharge_percent?: number;
  adults_surcharge_total?: number;
  extra_children?: number;
  child_surcharge_percent?: number;
  children_surcharge_total?: number;
  guest_surcharge_total?: number;
  nightly_rate: number;
  seasonal_multiplier: number;
  holiday_multiplier: number;
  long_stay_discount: number;
  long_stay_discount_percent?: number;
  accommodation_subtotal: number;
  accommodation_after_discount: number;
  cleaning_fee: number;
  service_fee: number;
  service_fee_percent?: number;
  total: number;
  currency: string;
}

export interface BookingQuoteRequest {
  listing_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  adults: number;
  children?: number;
  pets?: number;
}

export interface BookingCreateRequest {
  listing_id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  adults: number;
  children?: number;
  pets?: number;
  special_requests?: string;
  cost_split?: {
    people: number;
    per_person: number;
    total: number;
    currency: string;
    max_guests: number;
  } | null;
}

export interface Booking {
  id: string;
  listing: Listing;
  check_in: string;
  check_out: string;
  guests_count: number;
  adults: number;
  children: number;
  status:
    | "pending"
    | "awaiting_payment"
    | "confirmed"
    | "cancelled"
    | "rejected"
    | "completed";
  pricing_breakdown: Record<string, unknown> & {
    cost_split?: {
      people: number;
      per_person: string | number;
      total: string | number;
      currency: string;
      max_guests: number;
    };
  };
  final_amount: number;
  currency: string;
  special_requests: string;
  cancellation_policy_snapshot: string;
  created_at: string;
}

export interface Review {
  id: string;
  author: { first_name: string; last_name: string; avatar_url: string | null };
  overall_rating: number;
  title: string;
  content: string;
  created_at: string;
  subscores?: Record<string, number> | null;
}
