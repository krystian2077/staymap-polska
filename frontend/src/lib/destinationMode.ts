import type { DestinationScore, Listing } from "@/types/listing";

const SCORE_KEYS = [
  "romantic",
  "outdoor",
  "nature",
  "quiet",
  "family",
  "workation",
  "accessibility",
] as const satisfies readonly (keyof DestinationScore)[];

export function topTravelModeFromListing(listing: Listing): string | null {
  const d = listing.destination_score_cache;
  if (!d) return null;
  let bestKey: string | null = null;
  let best = -1;
  for (const k of SCORE_KEYS) {
    const n = Number(d[k]);
    if (!Number.isNaN(n) && n > best) {
      best = n;
      bestKey = k;
    }
  }
  return bestKey;
}
