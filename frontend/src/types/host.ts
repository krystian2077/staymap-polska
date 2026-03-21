export interface HostProfile {
  id: string;
  user_id?: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  is_verified: boolean;
  response_rate: number;
  average_rating: number | null;
  review_count: number;
  member_since: string;
  total_earnings?: number;
  payout_pending?: number;
}

export interface HostBooking {
  id: string;
  /** Konwersacja z gościem — jeśli istnieje w systemie wiadomości. */
  conversation_id?: string | null;
  listing: { id: string; slug: string; title: string };
  guest: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  check_in: string;
  check_out: string;
  guests_count: number;
  adults: number;
  status:
    | "pending"
    | "awaiting_payment"
    | "confirmed"
    | "cancelled"
    | "rejected"
    | "completed";
  final_amount: number;
  currency: string;
  special_requests: string;
  created_at: string;
}

export interface ListingDraft {
  id: string;
  completion_percent: number;
  step: number;
  title: string;
  description: string;
  listing_type_id: string | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  base_price: number;
  cleaning_fee: number;
  booking_mode: "instant" | "request";
  cancellation_policy: string;
  location: Partial<import("./listing").ListingLocation>;
  images: {
    id: string;
    display_url: string;
    is_cover: boolean;
    sort_order: number;
  }[];
  amenity_ids: string[];
}

export interface HostStats {
  revenue_this_month: number;
  revenue_last_month: number;
  occupancy_percent: number;
  avg_rating: number;
  bookings_count: number;
  bookings_pending: number;
  new_messages: number;
  reviews_pending_response: number;
}

export type BookingStatus =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "cancelled"
  | "rejected"
  | "completed";
