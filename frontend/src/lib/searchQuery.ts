import { LOCATION_TAG_KEYS } from "@/lib/locationTags";
import type { SearchParamsState } from "@/lib/store/searchStore";

/** Parametry z GET /ai/search/{id}/ (normalized_params). */
export function normalizedAiParamsToState(p: Record<string, unknown>): SearchParamsState {
  const out: SearchParamsState = {
    location: typeof p.location === "string" ? p.location : "",
    ordering: typeof p.ordering === "string" ? p.ordering : "recommended",
    radius_km: 50,
  };
  if (p.latitude != null && p.longitude != null) {
    const la = Number(p.latitude);
    const ln = Number(p.longitude);
    if (!Number.isNaN(la) && !Number.isNaN(ln)) {
      out.lat = la;
      out.lng = ln;
    }
  }
  if (p.radius_km != null) {
    const r = Number(p.radius_km);
    if (!Number.isNaN(r)) out.radius_km = r;
  }
  if (typeof p.date_from === "string") out.date_from = p.date_from.slice(0, 10);
  if (typeof p.date_to === "string") out.date_to = p.date_to.slice(0, 10);
  if (p.guests != null) {
    const g = Number(p.guests);
    if (!Number.isNaN(g) && g >= 1) out.guests = g;
  }
  if (typeof p.travel_mode === "string" && p.travel_mode) out.travel_mode = p.travel_mode;
  if (p.min_price != null) {
    const x = Number(p.min_price);
    if (!Number.isNaN(x)) out.min_price = x;
  }
  if (p.max_price != null) {
    const x = Number(p.max_price);
    if (!Number.isNaN(x)) out.max_price = x;
  }
  if (typeof p.booking_mode === "string" && p.booking_mode) {
    out.booking_mode = p.booking_mode;
  }
  return out;
}

/**
 * Buduje query string z pełnym zestawem parametrów wyszukiwania.
 * Używane do URL, requestów listy i requestów pinów.
 */
export function buildSearchQueryString(params: SearchParamsState): string {
  const q = new URLSearchParams();

  const loc = params.location?.trim();
  if (loc) q.set("location", loc);

  if (params.lat != null && params.lng != null) {
    q.set("latitude", String(params.lat));
    q.set("longitude", String(params.lng));
  }
  if (params.radius_km != null) q.set("radius_km", String(params.radius_km));
  if (params.date_from && params.date_to && params.date_from !== params.date_to) {
    q.set("date_from", params.date_from);
    q.set("date_to", params.date_to);
  }
  if (params.guests != null && params.guests >= 1) q.set("guests", String(params.guests));
  if (params.travel_mode) q.set("travel_mode", params.travel_mode);
  if (params.min_price != null) q.set("min_price", String(params.min_price));
  if (params.max_price != null) q.set("max_price", String(params.max_price));
  if (params.booking_mode) q.set("booking_mode", params.booking_mode);
  if (params.ordering) q.set("ordering", params.ordering);

  // Filtry premium
  if (params.listing_types?.length) {
    for (const lt of params.listing_types) q.append("listing_types", lt);
  }
  if (params.amenities?.length) {
    for (const am of params.amenities) q.append("amenities", am);
  }
  if (params.is_pet_friendly === true) q.set("is_pet_friendly", "true");

  // Tagi otoczenia
  for (const tag of LOCATION_TAG_KEYS) {
    if ((params as Record<string, unknown>)[tag] === true) {
      q.set(tag, "true");
    }
  }

  // Bbox (viewport mapy — tylko gdy "Szukaj w tym obszarze")
  if (
    params.bbox_south != null &&
    params.bbox_west != null &&
    params.bbox_north != null &&
    params.bbox_east != null
  ) {
    q.set("bbox_south", String(params.bbox_south));
    q.set("bbox_west", String(params.bbox_west));
    q.set("bbox_north", String(params.bbox_north));
    q.set("bbox_east", String(params.bbox_east));
  }

  return q.toString();
}

/** Parsuje URL search params do pełnego stanu wyszukiwania (brakujące klucze = domyślne). */
export function parseSearchParamsToState(sp: URLSearchParams): SearchParamsState {
  const out: SearchParamsState = {
    location: "",
    ordering: "recommended",
  };

  const loc = sp.get("location");
  if (loc) out.location = loc;

  const lat = sp.get("latitude");
  const lng = sp.get("longitude");
  if (lat && lng) {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!Number.isNaN(la) && !Number.isNaN(ln)) {
      out.lat = la;
      out.lng = ln;
    }
  }

  const rk = sp.get("radius_km");
  if (rk) {
    const r = parseFloat(rk);
    if (!Number.isNaN(r)) out.radius_km = r;
  }

  const df = sp.get("date_from");
  const dt = sp.get("date_to");
  if (df) out.date_from = df;
  if (dt) out.date_to = dt;

  const g = sp.get("guests");
  if (g) {
    const n = parseInt(g, 10);
    if (!Number.isNaN(n) && n >= 1) out.guests = n;
  }

  const tm = sp.get("travel_mode");
  if (tm) out.travel_mode = tm;

  const ord = sp.get("ordering");
  if (ord) out.ordering = ord;

  const mp = sp.get("min_price");
  if (mp) {
    const v = parseFloat(mp);
    if (!Number.isNaN(v)) out.min_price = v;
  }
  const xp = sp.get("max_price");
  if (xp) {
    const v = parseFloat(xp);
    if (!Number.isNaN(v)) out.max_price = v;
  }

  const bm = sp.get("booking_mode");
  if (bm) out.booking_mode = bm;

  // Filtry premium
  const lt = sp.getAll("listing_types");
  if (lt.length) out.listing_types = lt;

  const am = sp.getAll("amenities");
  if (am.length) out.amenities = am;

  const pet = sp.get("is_pet_friendly");
  if (pet === "true") out.is_pet_friendly = true;

  // Tagi otoczenia
  for (const tag of LOCATION_TAG_KEYS) {
    if (sp.get(tag) === "true") {
      (out as Record<string, unknown>)[tag] = true;
    }
  }

  // Bbox
  const bs = sp.get("bbox_south");
  const bw = sp.get("bbox_west");
  const bn = sp.get("bbox_north");
  const be = sp.get("bbox_east");
  if (bs && bw && bn && be) {
    const bsv = parseFloat(bs), bwv = parseFloat(bw), bnv = parseFloat(bn), bev = parseFloat(be);
    if (!Number.isNaN(bsv + bwv + bnv + bev)) {
      out.bbox_south = bsv;
      out.bbox_west = bwv;
      out.bbox_north = bnv;
      out.bbox_east = bev;
    }
  }

  return out;
}

/** Środek mapy z URL — tylko jeśli współrzędne są sensowne i w obrębie Polski. */
export function parseMapCenterFromSearchParams(
  sp: URLSearchParams,
): { lat: number; lng: number } | null {
  const lat = sp.get("latitude");
  const lng = sp.get("longitude");
  if (!lat || !lng) return null;
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < 48.8 || la > 55.1 || ln < 13.9 || ln > 24.6) return null;
  return { lat: la, lng: ln };
}

/** Liczba aktywnych filtrów (nie licząc lokalizacji/dat/gości). */
export function countActiveFilters(params: SearchParamsState): number {
  let n = 0;
  if (params.travel_mode) n++;
  if (params.min_price != null || params.max_price != null) n++;
  if (params.booking_mode) n++;
  if (params.listing_types?.length) n += params.listing_types.length;
  if (params.amenities?.length) n += params.amenities.length;
  if (params.is_pet_friendly) n++;
  for (const tag of LOCATION_TAG_KEYS) {
    if ((params as Record<string, unknown>)[tag] === true) n++;
  }
  return n;
}
