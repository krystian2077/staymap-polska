import type { Listing } from "./listing";

export interface PricingBreakdown {
  nights: number;
  guests?: number;
  guests_included?: number;
  extra_guests?: number;
  extra_guest_fee_per_night?: number;
  extra_guests_total?: number;
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
}

export interface BookingCreateRequest {
  listing_id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  adults: number;
  children?: number;
  special_requests?: string;
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
  pricing_breakdown: Record<string, unknown>;
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
