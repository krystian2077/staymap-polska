import { publicMediaUrl } from "@/lib/mediaUrl";
import type { SearchListing } from "@/lib/searchTypes";
import type { Listing, SimilarListing } from "@/types/listing";

const EMPTY_HOST: Listing["host"] = {
  id: "",
  display_name: "",
  bio: "",
  avatar_url: null,
  is_verified: false,
  response_rate: 0,
  average_rating: null,
  review_count: 0,
  member_since: "",
};

/** Karta wyszukiwania → pełny Listing (domyślne pola na brakujące dane z API). */
export function stubListingFromSearch(sl: SearchListing): Listing {
  const price = parseFloat(sl.base_price);
  const basePrice = Number.isNaN(price) ? 0 : price;
  const loc = sl.location;
  return {
    id: sl.id,
    slug: sl.slug,
    title: sl.title,
    short_description: "",
    description: "",
    listing_type: { name: "Nocleg", icon: "🏠", slug: "stay" },
    host: EMPTY_HOST,
    location: loc
      ? {
          country: loc.country || "PL",
          region: loc.region || "",
          city: loc.city || "",
          address_line: "",
          postal_code: "",
          latitude: loc.lat,
          longitude: loc.lng,
          near_lake: false,
          near_mountains: false,
          near_forest: false,
          near_sea: false,
        }
      : null,
    images: sl.cover_image
      ? [
          {
            id: "",
            display_url: sl.cover_image,
            is_cover: true,
            sort_order: 0,
            alt_text: "",
          },
        ]
      : [],
    amenities: [],
    max_guests: sl.max_guests || 0,
    guests_included: sl.max_guests || 2,
    extra_guest_fee: 0,
    bedrooms: 0,
    beds: 0,
    bathrooms: 0,
    is_pet_friendly: false,
    booking_mode: sl.booking_mode === "request" ? "request" : "instant",
    base_price: basePrice,
    currency: sl.currency || "PLN",
    cleaning_fee: null,
    service_fee_percent: 0,
    check_in_time: "",
    check_out_time: "",
    cancellation_policy: "moderate",
    average_rating: null,
    review_count: 0,
    destination_score_cache: null,
    area_summary: null,
    status: sl.status || "approved",
  };
}

export function similarListingToSearch(sl: SimilarListing): SearchListing {
  const cover =
    sl.images?.find((i) => i.is_cover)?.display_url ?? sl.images?.[0]?.display_url ?? null;
  return {
    id: sl.id,
    slug: sl.slug,
    title: sl.title,
    base_price: String(sl.base_price),
    currency: sl.currency,
    status: "approved",
    max_guests: 8,
    booking_mode: "instant",
    location: {
      lat: 0,
      lng: 0,
      city: sl.location.city,
      region: sl.location.region,
      country: "PL",
    },
    cover_image: publicMediaUrl(cover),
    created_at: "",
    distance_km: sl.distance_km,
    average_rating: sl.average_rating,
    review_count: sl.review_count,
  };
}
