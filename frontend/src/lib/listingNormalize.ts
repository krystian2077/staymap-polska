import { publicMediaUrl } from "@/lib/mediaUrl";
import type { Amenity, DestinationScore, HostProfile, Listing, ListingImage, ListingLocation } from "@/types/listing";

const AMENITY_LABELS: Record<string, { name: string; icon: string; category: string }> = {
  wifi: { name: "Wi-Fi", icon: "wifi", category: "connectivity" },
  kitchen: { name: "Kuchnia", icon: "kitchen", category: "home" },
  parking: { name: "Parking", icon: "parking", category: "access" },
  air_conditioning: { name: "Klimatyzacja", icon: "air_conditioning", category: "comfort" },
  heating: { name: "Ogrzewanie", icon: "heating", category: "comfort" },
  washer: { name: "Pralka", icon: "washer", category: "home" },
  tv: { name: "TV", icon: "tv", category: "entertainment" },
  workspace: { name: "Miejsce do pracy", icon: "workspace", category: "work" },
  pet_friendly: { name: "Przyjazne zwierzętom", icon: "pet_friendly", category: "rules" },
  pool: { name: "Basen", icon: "pool", category: "leisure" },
  sauna: { name: "Sauna", icon: "sauna", category: "wellness" },
  grill: { name: "Grill", icon: "grill", category: "outdoor" },
  fireplace: { name: "Kominek", icon: "fireplace", category: "comfort" },
  hot_tub: { name: "Jacuzzi", icon: "hot_tub", category: "wellness" },
  child_friendly: { name: "Dla rodzin z dziećmi", icon: "child_friendly", category: "family" },
  accessible: { name: "Udogodnienia dla osób z niepełnosprawnością", icon: "accessible", category: "access" },
};

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function toImages(raw: unknown): ListingImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    const o = x as Record<string, unknown>;
    const rawDisplay = (o.display_url ?? o.url) as string | null | undefined;
    const rawUrl = (o.url as string | null) ?? null;
    const display_url = publicMediaUrl(rawDisplay ?? rawUrl);
    const url = publicMediaUrl(rawUrl) ?? display_url;
    return {
      id: String(o.id),
      display_url,
      url,
      is_cover: Boolean(o.is_cover),
      sort_order: num(o.sort_order),
      alt_text: String(o.alt_text || ""),
    };
  });
}

function toAmenities(raw: unknown): Amenity[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    if (typeof x === "string") {
      const preset = AMENITY_LABELS[x];
      return {
        id: x,
        name: preset?.name ?? x.replace(/_/g, " "),
        icon: preset?.icon ?? "default",
        category: preset?.category ?? "other",
      };
    }
    const o = x as Record<string, unknown>;
    const id = String(o.id ?? o.name ?? "a");
    const preset = AMENITY_LABELS[id];
    return {
      id,
      name: String(o.name ?? preset?.name ?? id.replace(/_/g, " ")),
      icon: String(o.icon ?? preset?.icon ?? "default"),
      category: String(o.category ?? preset?.category ?? "other"),
    };
  });
}

function toLocation(raw: unknown): ListingLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.latitude == null && o.lat == null) return null;
  return {
    country: String(o.country ?? "PL"),
    region: String(o.region ?? ""),
    city: String(o.city ?? ""),
    address_line: String(o.address_line ?? ""),
    postal_code: String(o.postal_code ?? ""),
    latitude: num(o.latitude ?? o.lat),
    longitude: num(o.longitude ?? o.lng),
    near_lake: Boolean(o.near_lake),
    near_mountains: Boolean(o.near_mountains),
    near_forest: Boolean(o.near_forest),
    near_sea: Boolean(o.near_sea),
  };
}

function toHost(raw: unknown): HostProfile {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      display_name: "Gospodarz",
      bio: "",
      avatar_url: null,
      is_verified: false,
      response_rate: 0,
      average_rating: null,
      review_count: 0,
      member_since: "",
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    id: String(o.id ?? ""),
    display_name: String(o.display_name ?? "Gospodarz"),
    bio: String(o.bio ?? ""),
    avatar_url: (o.avatar_url as string | null) ?? null,
    is_verified: Boolean(o.is_verified),
    response_rate: num(o.response_rate),
    average_rating: o.average_rating == null ? null : num(o.average_rating),
    review_count: num(o.review_count),
    member_since: String(o.member_since ?? ""),
  };
}

function parseAverageSubscores(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys = ["cleanliness", "location", "communication", "accuracy"] as const;
  const out: Record<string, number> = {};
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) out[k] = n;
    }
  }
  return Object.keys(out).length ? out : null;
}

function toDestinationScore(raw: unknown): DestinationScore | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const keys = [
    "romantic",
    "outdoor",
    "nature",
    "quiet",
    "family",
    "wellness",
    "workation",
    "accessibility",
  ] as const;
  const out: Partial<DestinationScore> = {
    calculated_at: String(o.calculated_at ?? new Date().toISOString()),
    version: o.version != null ? num(o.version) : undefined,
  };
  for (const k of keys) {
    (out as Record<string, number>)[k] = num(o[k]);
  }
  return out as DestinationScore;
}

export function normalizeListing(raw: Record<string, unknown>): Listing {
  const lt = raw.listing_type as Record<string, string> | undefined;
  return {
    id: String(raw.id),
    slug: String(raw.slug),
    title: String(raw.title),
    short_description: String(raw.short_description ?? ""),
    description: String(raw.description ?? ""),
    listing_type: lt
      ? { name: lt.name, icon: lt.icon, slug: lt.slug }
      : { name: "Domek", icon: "🏠", slug: "domek" },
    host: toHost(raw.host),
    location: toLocation(raw.location),
    images: toImages(raw.images),
    amenities: toAmenities(raw.amenities),
    max_guests: num(raw.max_guests, 2),
    guests_included: num(raw.guests_included, 2),
    extra_guest_fee: num(raw.extra_guest_fee, 0),
    bedrooms: num(raw.bedrooms, 1),
    beds: num(raw.beds, 1),
    bathrooms: num(raw.bathrooms, 1),
    is_pet_friendly: Boolean(raw.is_pet_friendly),
    booking_mode: (raw.booking_mode === "request" ? "request" : "instant") as
      | "instant"
      | "request",
    base_price: num(raw.base_price),
    currency: String(raw.currency ?? "PLN"),
    cleaning_fee:
      raw.cleaning_fee == null || raw.cleaning_fee === ""
        ? null
        : num(raw.cleaning_fee),
    service_fee_percent: num(raw.service_fee_percent, 15),
    apply_pl_travel_peak_extras: raw.apply_pl_travel_peak_extras !== false,
    check_in_time: String(raw.check_in_time ?? "15:00"),
    check_out_time: String(raw.check_out_time ?? "11:00"),
    cancellation_policy: (String(
      raw.cancellation_policy ?? "flexible"
    ) as Listing["cancellation_policy"]) || "flexible",
    average_rating:
      raw.average_rating == null || raw.average_rating === ""
        ? null
        : num(raw.average_rating),
    review_count: num(raw.review_count),
    average_subscores: parseAverageSubscores(raw.average_subscores),
    destination_score_cache: toDestinationScore(raw.destination_score_cache),
    area_summary:
      raw.area_summary == null || raw.area_summary === ""
        ? null
        : String(raw.area_summary),
    status: String(raw.status ?? "draft"),
  };
}
