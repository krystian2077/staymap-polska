import type { CompareRow, RowKind } from "@/components/compare/CompareListingCard";
import type { Listing } from "@/types/listing";

function hasAmenity(listing: Listing, sub: string) {
  return listing.amenities?.some((a) => a.name.toLowerCase().includes(sub)) ?? false;
}

function avgDestScore(listing: Listing): number {
  const d = listing.destination_score_cache;
  if (!d) return 0;
  const vals = [
    d.romantic,
    d.nature,
    d.outdoor,
    d.quiet,
    d.family,
    d.workation,
    d.accessibility,
  ];
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function totalAlgoScore(listing: Listing): number {
  const price = Math.max(listing.base_price || 1, 1);
  const rating = listing.average_rating ?? 0;
  const dest = avgDestScore(listing);
  return (1 / price) * 0.3 + rating * 0.3 + (dest / 10) * 0.4;
}

export function winnerListingId(listings: Listing[]): string | null {
  if (listings.length < 2) return null;
  let best = listings[0];
  let bestS = totalAlgoScore(best);
  for (let i = 1; i < listings.length; i++) {
    const s = totalAlgoScore(listings[i]);
    if (s > bestS) {
      best = listings[i];
      bestS = s;
    }
  }
  return best.id;
}

function rowMeta(
  kind: RowKind,
  values: (number | string | null | boolean)[]
): { emphasizeIdx: Set<number>; badIdx: Set<number> } {
  const emphasizeIdx = new Set<number>();
  const badIdx = new Set<number>();
  if (kind === "price") {
    const nums = values.map((v, i) => (typeof v === "number" ? { v, i } : null)).filter(Boolean) as {
      v: number;
      i: number;
    }[];
    if (nums.length) {
      const min = Math.min(...nums.map((x) => x.v));
      const max = Math.max(...nums.map((x) => x.v));
      nums.forEach(({ v, i }) => {
        if (v === min) emphasizeIdx.add(i);
        if (v === max && max !== min) badIdx.add(i);
      });
    }
  }
  if (kind === "rating" || kind === "number") {
    const nums = values.map((v, i) => (typeof v === "number" ? { v, i } : null)).filter(Boolean) as {
      v: number;
      i: number;
    }[];
    if (nums.length) {
      const min = Math.min(...nums.map((x) => x.v));
      const max = Math.max(...nums.map((x) => x.v));
      nums.forEach(({ v, i }) => {
        if (v === max) emphasizeIdx.add(i);
        if (v === min && min !== max) badIdx.add(i);
      });
    }
  }
  if (kind === "reviews") {
    const nums = values.map((v, i) => (typeof v === "number" ? { v, i } : null)).filter(Boolean) as {
      v: number;
      i: number;
    }[];
    if (nums.length) {
      const max = Math.max(...nums.map((x) => x.v));
      nums.forEach(({ v, i }) => {
        if (v === max) emphasizeIdx.add(i);
      });
    }
  }
  return { emphasizeIdx, badIdx };
}

/** Wspólne wiersze metryk dla `/compare` i podglądu na ulubionych (te same reguły co strona porównania). */
export function buildCompareRows(listings: Listing[]): CompareRow[] {
  const prices = listings.map((l) => l.base_price);
  const ratings = listings.map((l) => l.average_rating ?? 0);
  const reviews = listings.map((l) => l.review_count || 0);
  const workation = listings.map((l) => l.destination_score_cache?.workation || 0);
  const romantic = listings.map((l) => l.destination_score_cache?.romantic || 0);
  const nature = listings.map((l) => l.destination_score_cache?.nature || 0);

  const pm = rowMeta("price", prices);
  const rm = rowMeta("rating", ratings);
  const wm = rowMeta("number", workation);
  const romM = rowMeta("number", romantic);
  const natM = rowMeta("number", nature);
  const revM = rowMeta("reviews", reviews);

  return [
    {
      label: "Cena / noc",
      kind: "price",
      meta: pm,
      cells: listings.map((l) => `${l.base_price || 0} ${l.currency || "PLN"}`),
    },
    {
      label: "Ocena",
      kind: "rating",
      meta: rm,
      cells: listings.map((l) => (l.average_rating != null ? Number(l.average_rating).toFixed(1) : "—")),
    },
    {
      label: "Typ",
      kind: "text",
      meta: { emphasizeIdx: new Set(), badIdx: new Set() },
      cells: listings.map((l) => l.listing_type?.name || "Obiekt 🏠"),
    },
    {
      label: "Recenzje",
      kind: "reviews",
      meta: revM,
      cells: listings.map((l) => l.review_count || 0),
    },
    {
      label: "Sauna",
      kind: "bool",
      meta: { emphasizeIdx: new Set(), badIdx: new Set() },
      cells: listings.map((l) => (hasAmenity(l, "saun") ? "✓" : "✗")),
    },
    {
      label: "WiFi",
      kind: "bool",
      meta: { emphasizeIdx: new Set(), badIdx: new Set() },
      cells: listings.map((l) => (hasAmenity(l, "wifi") || hasAmenity(l, "wi-fi") ? "✓" : "✗")),
    },
    {
      label: "Zwierzęta",
      kind: "bool",
      meta: { emphasizeIdx: new Set(), badIdx: new Set() },
      cells: listings.map((l) => (l.is_pet_friendly ? "✓" : "✗")),
    },
    {
      label: "Max goście",
      kind: "number",
      meta: rowMeta(
        "number",
        listings.map((l) => l.max_guests || 2)
      ),
      cells: listings.map((l) => l.max_guests || 2),
    },
    {
      label: "Sypialnie",
      kind: "number",
      meta: rowMeta("number", listings.map((l) => l.bedrooms || 1)),
      cells: listings.map((l) => l.bedrooms || 1),
    },
    {
      label: "Łóżka",
      kind: "number",
      meta: rowMeta("number", listings.map((l) => l.beds || 1)),
      cells: listings.map((l) => l.beds || 1),
    },
    {
      label: "Workation",
      kind: "number",
      meta: wm,
      cells: listings.map((l) => (l.destination_score_cache?.workation ?? "—") as string | number),
    },
    {
      label: "Romantyczność",
      kind: "number",
      meta: romM,
      cells: listings.map((l) => (l.destination_score_cache?.romantic ?? "—") as string | number),
    },
    {
      label: "Natura",
      kind: "number",
      meta: natM,
      cells: listings.map((l) => (l.destination_score_cache?.nature ?? "—") as string | number),
    },
  ];
}
