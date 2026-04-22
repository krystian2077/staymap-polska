import { cancellationDeadline } from "./dates";

export function cancellationPolicyText(policy: string, checkIn: string): string {
  const deadline = cancellationDeadline(checkIn, policy);
  if (policy === "flexible")
    return `Pełny zwrot do ${deadline}. Bez zwrotu po tej dacie.`;
  if (policy === "moderate")
    return `Pełny zwrot do ${deadline}. 50% zwrotu przy późniejszym anulowaniu.`;
  if (policy === "strict")
    return `Pełny zwrot do ${deadline}. 50% zwrotu przy późniejszym anulowaniu.`;
  if (policy === "non_refundable") return "Brak zwrotu przy anulowaniu.";
  return "";
}

export function displayBookingId(id: string): string {
  return `STM-${new Date().getFullYear()}-${id.slice(0, 4).toUpperCase()}`;
}

export function formatGuests(adults: number, children: number): string {
  let text = `${adults} dorosł${adults === 1 ? "y" : "ych"}`;
  if (children > 0) text += `, ${children} dzie${children === 1 ? "cko" : "ci"}`;
  return text;
}

export const SCORE_LABELS: Record<string, string> = {
  romantic: "Romantyczność",
  outdoor: "Outdoor",
  nature: "Natura",
  quiet: "Spokój",
  family: "Rodzinny",
  workation: "Workation",
  accessibility: "Dojazd",
};

export function topScores(
  scores: Record<string, number>,
  n = 2
): string[] {
  return Object.entries(scores)
    .filter(([k]) => k !== "calculated_at" && k !== "version")
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([key]) => key);
}

export const MODE_EMOJI: Record<string, string> = {
  romantic: "💑",
  outdoor: "🏕️",
  nature: "🌿",
  quiet: "🌿",
  family: "👨‍👩‍👧",
  workation: "💻",
  accessibility: "🚗",
  lake: "🏊",
  mountains: "⛰️",
  pet: "🐕",
};

export const AMENITY_EMOJI: Record<string, string> = {
  sauna: "🧖",
  wifi: "📶",
  parking: "🅿️",
  fireplace: "🔥",
  pool: "🏊",
  garden: "🌿",
  jacuzzi: "💆",
  ac: "❄️",
  air_conditioning: "❄️",
  washer: "🫧",
  tv: "📺",
  kitchen: "🍳",
  bike: "🚲",
  desk: "💻",
  workspace: "💻",
  terrace: "🏔️",
  pets: "🐕",
  pet_friendly: "🐾",
  hot_tub: "🛁",
  fast_wifi: "📶",
  cot: "🛏️",
  heating: "🔥",
  grill: "🍖",
  child_friendly: "👨‍👩‍👧",
  accessible: "♿",
  default: "✓",
};

export const POI_CATEGORY_CONFIG: Record<
  string,
  { emoji: string; label: string; bg: string }
> = {
  restaurant: { emoji: "🍽️", label: "Restauracje", bg: "#fff3e0" },
  outdoor: { emoji: "🥾", label: "Outdoor", bg: "#e8f5e9" },
  shop: { emoji: "🛒", label: "Sklepy", bg: "#fff8e1" },
  transport: { emoji: "🚌", label: "Dojazd", bg: "#e8eaf6" },
};

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export const TRAVEL_MODE_LABELS: Record<string, string> = {
  romantic: "Romantyczny",
  outdoor: "Outdoor",
  nature: "Natura",
  quiet: "Spokój",
  family: "Rodzinny",
  workation: "Workation",
  accessibility: "Dojazd",
  pet: "Z pupilem",
  slow: "Slow",
  lake: "Jeziora",
  mountains: "Góry",
};
